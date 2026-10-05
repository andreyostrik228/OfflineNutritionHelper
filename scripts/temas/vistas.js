/**
 * scripts/temas/vistas.js
 * ─────────────────────────────────────────────────────────────────────────
 * Saca las miniaturas del menú de Ajustes (assets/img/aspectos/<id>.webp,
 * 300 x 250): la parte de arriba de "Mis datos" con cada aspecto puesto.
 *
 *   node scripts/temas/vistas.js              # todos los de js/core/look.js
 *   node scripts/temas/vistas.js hojas noche
 *
 * Hace falta Playwright con un Chromium, que NO es una dependencia del
 * proyecto (no hay package.json): se busca en PLAYWRIGHT_MODULE (ruta del
 * módulo) y el navegador en CHROMIUM. Y la aplicación servida en
 * http://localhost:8123 (por ejemplo `npx http-server . -p 8123 -c-1 -s`).
 * Es una herramienta de desarrollo: solo hay que volver a pasarla cuando un
 * aspecto cambia de cara.
 *
 * El WebP lo codifica el propio Chromium (canvas.toDataURL), así que no hace
 * falta ninguna librería de imágenes.
 * ─────────────────────────────────────────────────────────────────────────
 */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var RAIZ = path.join(__dirname, "..", "..");
var playwright = require(process.env.PLAYWRIGHT_MODULE || "playwright");
var EXE = process.env.CHROMIUM || undefined;
var URL = process.env.URL_APP || "http://localhost:8123/index.html";

// Los ids salen de look.js, la única lista.
var sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(RAIZ, "js/core/look.js"), "utf8"), sandbox);
var TODOS = JSON.parse(JSON.stringify(sandbox.LOOKS)).map(function (l) { return l.id; });

/** Atraviesa la bienvenida y las preguntas con los valores por defecto. */
async function entrar(page) {
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(1100);
  await page.check("#onboardingAcceptTerms");
  await page.click("#onboardingSkipAccountBtn");
  await page.waitForTimeout(300);
  await page.click("#onboardingStartBtn");
  for (var i = 0; i < 22; i++) {
    if (!(await page.isVisible("#onboardingIntake"))) break;
    var ch = await page.$('#onboardingAnswer .onboarding__choice[data-value="ru"]');
    if (!ch) ch = await page.$("#onboardingAnswer .onboarding__choice");
    if (ch) await ch.click().catch(function () {});
    await page.click("#onboardingNextBtn").catch(function () {});
    await page.waitForTimeout(170);
  }
  await page.waitForTimeout(1200);
  try {
    await page.waitForSelector(".tour__skip", { state: "visible", timeout: 3500 });
    await page.click(".tour__skip");
    await page.waitForTimeout(500);
  } catch (e) { /* sin recorrido */ }
}

async function una(browser, id) {
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "ru" });
  await ctx.route(/cdnjs|jsdelivr/, function (r) { return r.abort(); });
  var page = await ctx.newPage();
  await page.addInitScript(function (look) {
    try { localStorage.setItem("nutritionPlanner.lang.v1", "ru"); localStorage.setItem("nutritionPlanner.look.v1", look); } catch (e) {}
    // Mismo reloj y mismo azar para todos: las miniaturas se parecen entre sí salvo en el diseño.
    var FIJO = new Date(2026, 9, 5, 6, 10, 0).getTime(), RD = Date;
    window.Date = class extends RD { constructor() { if (arguments.length === 0) super(FIJO); else super(...arguments); } static now() { return FIJO; } };
    var s = 20261005; Math.random = function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }, id);
  await entrar(page);
  if (await page.isVisible(".tabbar__btn")) await page.click(".tabbar__btn[data-destino=datos]");
  await page.evaluate(function () { window.scrollTo(0, 0); });
  await page.waitForTimeout(700);
  var png = await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 325 } });
  var b64 = await page.evaluate(async function (b64png) {
    var img = new Image();
    img.src = "data:image/png;base64," + b64png;
    await img.decode();
    var c = document.createElement("canvas");
    c.width = 300; c.height = 250;
    var g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, 300, 250);
    return c.toDataURL("image/webp", 0.74).split(",")[1];
  }, png.toString("base64"));
  var destino = path.join(RAIZ, "assets", "img", "aspectos", id + ".webp");
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, Buffer.from(b64, "base64"));
  console.log(id, Math.round(fs.statSync(destino).size / 1024) + " KB");
  await ctx.close();
}

(async function () {
  var ids = process.argv.slice(2);
  if (!ids.length) ids = TODOS;
  var browser = await playwright.chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  for (var i = 0; i < ids.length; i++) await una(browser, ids[i]);
  await browser.close();
})();
