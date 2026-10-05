"use strict";
/**
 * scripts/i18n/escanear-pantallas.js
 * ──────────────────────────────────────────────────────────────────────
 * Abre la aplicación en un idioma y la RECORRE como lo haría una persona
 * (bienvenida, condiciones, acceso, las 16 preguntas, recorrido guiado,
 * plan, avisos, "sin cocinar", despensa, "Mis planes", ajustes, pestañas del
 * móvil), y lee TODO el texto que hay en pantalla en cada paso: nodos de
 * texto y atributos (`title`, `aria-label`, `placeholder`, `alt`).
 *
 * Por qué existe: `inventario.js` cuenta literales en el código, pero solo
 * ve los que llevan acento, y no ve lo que se ARMA al pintar (un
 * " kcal" pegado detrás de un número, un aviso del motor, un "cambiar" en
 * un botón). Eso solo se ve ejecutando. Una clave que no casa o una cadena
 * escrita a pelo NO da error: sale en español dentro de la interfaz en ruso
 * y los tests pasan (ver LEEME.md, "La regla que lo explica casi todo").
 *
 * Qué marca, en un idioma que no es el español:
 *   - letras o palabras españolas (¿ ¡ ñ á é í ó ú ü, "de", "con", "para"…);
 *   - en ruso, unidades latinas pegadas a un número ("840 g", "2499 kcal");
 *   - en ruso, cualquier palabra latina que no sea una marca conocida;
 *   - en inglés, letras cirílicas.
 *
 * Qué NO marca, a propósito: los nombres de producto de Mercadona (están
 * en la etiqueta del supermercado y no se traducen), y el nombre de cada
 * idioma en su propio idioma. Los elementos de producto se saltan por su
 * clase CSS (ver PRODUCTO_SELECTORES).
 *
 * Uso:
 *   node scripts/i18n/escanear-pantallas.js                 # ru y en, escritorio y móvil
 *   node scripts/i18n/escanear-pantallas.js ru              # solo ruso
 *   node scripts/i18n/escanear-pantallas.js ru --movil      # solo 390 px
 *   node scripts/i18n/escanear-pantallas.js ru --url=http://127.0.0.1:8124
 *   node scripts/i18n/escanear-pantallas.js ru --todo       # también lo que está oculto
 *   node scripts/i18n/escanear-pantallas.js ru --json       # salida para otra herramienta
 *   node scripts/i18n/escanear-pantallas.js ru --captura    # guarda una PNG por paso
 *   node scripts/i18n/escanear-pantallas.js ru --resumen    # una línea por elemento, no por texto
 *
 * Sale con código 1 si encuentra algo, para poder colgarlo de un script.
 *
 * Necesita Playwright y un Chromium. Los busca en PLAYWRIGHT_PATH /
 * CHROMIUM_PATH y, si no, en /opt/node-tools y /opt/pw-browsers. Sin
 * --url levanta su propio servidor estático sobre este repositorio, así
 * que no hace falta http-server.
 *
 * El navegador de pruebas NO tiene red: GSAP, la tipografía y el SDK de
 * Firebase no cargan. Por eso se pone un GSAP de mentira (hace lo mínimo que
 * pide js/ui/animations.js) -- sin él el conteo animado de las cifras del
 * resumen, que reescribe su texto, no se ejecutaría nunca aquí -- y se
 * fuerza a la vista el formulario de acceso, que sin cuentas está oculto.
 * ──────────────────────────────────────────────────────────────────────
 */
var fs = require("fs");
var path = require("path");
var http = require("http");

var REPO = path.resolve(__dirname, "..", "..");

// ── Argumentos ─────────────────────────────────────────────────────────
var args = process.argv.slice(2);
function opcion(nombre) {
  for (var i = 0; i < args.length; i++) {
    if (args[i] === "--" + nombre) return true;
    if (args[i].indexOf("--" + nombre + "=") === 0) return args[i].slice(nombre.length + 3);
  }
  return false;
}
var IDIOMAS = args.filter(function (a) { return /^[a-z]{2}$/.test(a); });
if (!IDIOMAS.length) IDIOMAS = ["ru", "en"];
var SOLO_MOVIL = !!opcion("movil");
var SOLO_ESCRITORIO = !!opcion("escritorio");
var VER_OCULTO = !!opcion("todo");
var SALIDA_JSON = !!opcion("json");
var CAPTURAS = !!opcion("captura");
var RESUMEN = !!opcion("resumen");
var URL_EXTERNA = opcion("url");
// --ignora=regex : descarta los hallazgos cuyo "dónde" (ruta del elemento) la cumpla.
var IGNORA = opcion("ignora") ? new RegExp(opcion("ignora")) : null;

// ── Qué se salta, qué se permite ───────────────────────────────────────

/**
 * Elementos cuyo texto es un NOMBRE DE PRODUCTO (lo que pone en la
 * estantería): se quedan en español en todos los idiomas. La lista de clases
 * vive en detector.js, que es quien la comparte con los tests.
 */
var PRODUCTO_SELECTORES = require("./detector").PRODUCTO_CLASES.map(function (c) { return "." + c; });

// ── Servidor estático mínimo (sin dependencias) ────────────────────────
var MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json", ".woff2": "font/woff2"
};
function servir() {
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var ruta = decodeURIComponent(req.url.split("?")[0]);
      if (ruta === "/") ruta = "/index.html";
      var f = path.join(REPO, ruta);
      if (f.indexOf(REPO) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); res.end("no"); return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, "127.0.0.1", function () { resolve(srv); });
  });
}

// ── Playwright ─────────────────────────────────────────────────────────
function cargarPlaywright() {
  var candidatos = [process.env.PLAYWRIGHT_PATH, "playwright", "/opt/node-tools/node_modules/playwright"];
  for (var i = 0; i < candidatos.length; i++) {
    if (!candidatos[i]) continue;
    try { return require(candidatos[i]); } catch (e) { /* siguiente */ }
  }
  console.error("No encuentro Playwright. Pon PLAYWRIGHT_PATH=/ruta/a/node_modules/playwright");
  process.exit(2);
}
function rutaChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  var base = "/opt/pw-browsers";
  try {
    var dirs = fs.readdirSync(base).filter(function (d) { return /^chromium-\d+$/.test(d); }).sort();
    for (var i = dirs.length - 1; i >= 0; i--) {
      var exe = path.join(base, dirs[i], "chrome-linux", "chrome");
      if (fs.existsSync(exe)) return exe;
    }
  } catch (e) { /* sin carpeta */ }
  return undefined;
}

// ── Lo que se ejecuta DENTRO de la página ──────────────────────────────

/** Un GSAP de mentira: lo mínimo que usa js/ui/animations.js, en seco. */
function gsapDeMentira() {
  var mm = { add: function (cond, fn) { try { fn({ conditions: { motionOK: true } }); } catch (e) { console.error("gsap-stub", e); } } };
  var tl = { from: function () { return tl; }, to: function () { return tl; } };
  window.gsap = {
    matchMedia: function () { return mm; },
    timeline: function () { return tl; },
    from: function () {},
    set: function () {},
    to: function (obj, v) {
      if (v && typeof v === "object" && "val" in v) {
        obj.val = v.val;
        if (v.onUpdate) v.onUpdate();
        if (v.onComplete) v.onComplete();
      }
    }
  };
}

/** Recoge todo el texto del documento. Se serializa y corre en el navegador. */
function recogerTextos(opts) {
  var res = [];
  var SALTAR = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  var ATRS = ["title", "aria-label", "placeholder", "alt", "aria-description"];
  function visible(el) {
    try {
      if (el.closest("[inert]") && !el.closest("#onboarding")) { /* inert no esconde el texto */ }
      return el.checkVisibility({ checkVisibilityCSS: true });
    } catch (e) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
  }
  function ruta(el) {
    var partes = [];
    for (var n = el, i = 0; n && n !== document.body && i < 4; n = n.parentElement, i++) {
      var s = n.tagName.toLowerCase();
      if (n.id) s += "#" + n.id;
      else if (n.className && typeof n.className === "string") s += "." + n.className.trim().split(/\s+/).slice(0, 2).join(".");
      partes.unshift(s);
      if (n.id) break;
    }
    return partes.join(" > ");
  }
  function enProducto(el) {
    for (var i = 0; i < opts.producto.length; i++) {
      try { if (el.closest(opts.producto[i])) return true; } catch (e) { /* selector raro */ }
    }
    return false;
  }
  function anadir(tipo, texto, el) {
    texto = String(texto).replace(/\s+/g, " ").trim();
    if (!texto || !/[A-Za-zÀ-ÿА-Яа-яЁё¿¡]/.test(texto)) return;
    res.push({ k: tipo, t: texto, e: ruta(el), v: visible(el), prod: enProducto(el) });
  }
  (function recorrer(nodo) {
    for (var c = nodo.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) {
        anadir("texto", c.nodeValue, c.parentElement);
      } else if (c.nodeType === 1 && !SALTAR[c.tagName]) {
        ATRS.forEach(function (a) { if (c.hasAttribute(a)) anadir("@" + a, c.getAttribute(a), c); });
        if (c.tagName === "INPUT" && /^(button|submit|reset)$/.test(c.type)) anadir("@value", c.value, c);
        recorrer(c);
      }
    }
  })(document.body);
  anadir("titulo", document.title, document.body);
  return res;
}

// ── Análisis (en Node) ─────────────────────────────────────────────────
// El criterio vive en detector.js, compartido con tests/i18n-render.test.js:
// si hubiera dos, el test diría que está bien lo que el barrido marca.
var detector = require("./detector");
function analizar(item, lang) {
  return detector.analizarTexto(item.t, lang);
}

// ── El recorrido ───────────────────────────────────────────────────────

async function recorrer(page, lang, etiqueta, instantanea, vista) {
  var pasos = [];
  function paso(nombre, fn) { pasos.push([nombre, fn]); }
  var dormir = function (ms) { return page.waitForTimeout(ms); };
  async function existe(sel) { return (await page.locator(sel).count()) > 0; }
  async function visibleSel(sel) {
    try { return await page.locator(sel).first().isVisible(); } catch (e) { return false; }
  }
  async function clic(sel, opts) {
    var l = page.locator(sel).first();
    await l.click(Object.assign({ timeout: 3000 }, opts || {}));
  }
  async function intentar(nombre, fn) {
    try { await fn(); } catch (e) {
      instantanea.fallos.push(etiqueta + " :: " + nombre + " :: " + String(e.message).split("\n")[0]);
    }
  }
  async function foto(nombre) {
    await instantanea.tomar(nombre);
  }

  // 1. Bienvenida y condiciones.
  await dormir(1200);
  await intentar("bienvenida", async function () { await foto("bienvenida"); });
  await intentar("condiciones", async function () {
    await clic("#onboardingOpenTerms");
    await dormir(300);
    await foto("condiciones");
    await clic("#legalDialogDoneBtn");
    await dormir(200);
  });

  // 2. El diálogo de acceso, en sus tres modos. Sin Firebase (no hay red)
  //    las cuentas "no están disponibles"; se fuerza a la vista el formulario.
  await intentar("terminos", async function () {
    await page.locator("#onboardingAcceptTerms").check({ timeout: 3000 });
  });
  await intentar("acceso", async function () {
    await clic("#onboardingSignInBtn");
    await dormir(300);
    await foto("acceso-sin-cuentas");
    await page.evaluate(function () {
      var a = document.getElementById("authUnavailableBox"); if (a) a.hidden = true;
      var b = document.getElementById("authAvailableBox"); if (b) b.hidden = false;
    });
    await foto("acceso-entrar");
    await clic("#authSubmitBtn"); await dormir(200);
    await foto("acceso-entrar-vacio");
    await clic("#authSwitchModeBtn"); await dormir(150);
    await foto("acceso-registro");
    await clic("#authSubmitBtn"); await dormir(200);
    await foto("acceso-registro-vacio");
    await page.fill("#authEmail", "a@b.co");
    await page.fill("#authPassword", "123");
    await page.fill("#authPassword2", "123");
    await clic("#authSubmitBtn"); await dormir(200);
    await foto("acceso-registro-corta");
    await page.fill("#authPassword", "123456");
    await page.fill("#authPassword2", "654321");
    await clic("#authSubmitBtn"); await dormir(200);
    await foto("acceso-registro-distintas");
    await clic("#authSwitchModeBtn"); await dormir(150);
    await clic("#authForgotBtn"); await dormir(150);
    await foto("acceso-recuperar");
    await page.fill("#authEmail", ""); await clic("#authSubmitBtn"); await dormir(200);
    await foto("acceso-recuperar-vacio");
    // Todos los mensajes de error que sabe dar auth.js.
    await page.evaluate(function () {
      var cods = ["auth/invalid-credential", "auth/email-already-in-use", "auth/invalid-email",
        "auth/weak-password", "auth/too-many-requests", "auth/popup-blocked",
        "auth/requires-recent-login", "auth/network-request-failed", "auth/otro"];
      var out = cods.map(function (c) { return authErrorMessage({ code: c }); });
      out.push(authErrorMessage({ message: "not_configured" }));
      out.push(authErrorMessage({ message: "not_authenticated" }));
      var ul = document.createElement("ul"); ul.id = "__auth_msgs";
      out.forEach(function (m) { var li = document.createElement("li"); li.textContent = m; ul.appendChild(li); });
      document.getElementById("authDialog").appendChild(ul);
    });
    await foto("acceso-mensajes");
    await page.evaluate(function () { var u = document.getElementById("__auth_msgs"); if (u) u.remove(); });
    await clic("#authDialogCloseBtn"); await dormir(200);
  });

  // 3. Seguir sin cuenta y las preguntas. Cerrar el diálogo de acceso sin
  //    cuentas disponibles ya deja la bienvenida atrás; si no, se pulsa.
  await intentar("sin-cuenta", async function () {
    if (await visibleSel("#onboardingSkipAccountBtn")) {
      await clic("#onboardingSkipAccountBtn");
      await dormir(400);
    }
    if (await visibleSel("#onboardingStartBtn")) {
      await foto("inicio-del-cuestionario");
      await clic("#onboardingStartBtn");
      await dormir(300);
    }
  });
  await intentar("preguntas", async function () {
    for (var i = 0; i < 24; i++) {
      if (!(await visibleSel("#onboardingIntake"))) break;
      await foto("pregunta-" + (i + 1));
      var tipo = await page.evaluate(function () {
        var a = document.getElementById("onboardingAnswer");
        if (!a) return "?";
        if (a.querySelector(".onboarding__choice")) return "opciones";
        if (a.querySelector("#onboardingNumberInput")) return "numero";
        if (a.querySelector("#onboardingFreeInput")) return document.querySelector("#onboardingFreeInput").type;
        return "?";
      });
      if (tipo === "opciones") {
        if (i === 1) { // sin elegir nada: el aviso de «elige una opción»
          await page.evaluate(function () {
            Array.prototype.forEach.call(document.querySelectorAll(".onboarding__choice"), function (b) { b.classList.remove("is-selected"); });
          });
          await clic("#onboardingNextBtn"); await dormir(150);
          await foto("pregunta-" + (i + 1) + "-sin-elegir");
        }
        var sel = page.locator(".onboarding__choice.is-selected").first();
        if (await sel.count()) await sel.click(); else await page.locator(".onboarding__choice").first().click();
        await dormir(450);
      } else if (tipo === "numero") {
        if (i === 2) { // fuera de rango
          await page.fill("#onboardingNumberInput", "9999"); await clic("#onboardingNextBtn"); await dormir(150);
          await foto("pregunta-" + (i + 1) + "-fuera-de-rango");
          await page.fill("#onboardingNumberInput", ""); await clic("#onboardingNextBtn"); await dormir(150);
          await foto("pregunta-" + (i + 1) + "-vacia");
          await page.fill("#onboardingNumberInput", "28");
        }
        await clic("#onboardingNextBtn"); await dormir(350);
      } else if (tipo === "time") {
        await page.fill("#onboardingFreeInput", "");
        await clic("#onboardingNextBtn"); await dormir(150);
        await foto("pregunta-" + (i + 1) + "-sin-hora");
        await page.fill("#onboardingFreeInput", "07:30");
        await clic("#onboardingNextBtn"); await dormir(300);
      } else {
        await clic("#onboardingNextBtn"); await dormir(400);
      }
    }
  });

  // 4. El plan que sale del alta y el recorrido guiado.
  await intentar("plan-del-alta", async function () {
    await page.waitForSelector(".meal-card:not(.meal-card--empty)", { timeout: 20000 });
    await dormir(800);
    await foto("plan-tras-el-alta");
  });
  await intentar("recorrido", async function () {
    for (var i = 0; i < 20; i++) {
      if (!(await visibleSel("#tour .tour__card"))) { await dormir(300); if (!(await visibleSel("#tour .tour__card"))) break; }
      await dormir(250);
      await foto("recorrido-" + (i + 1));
      var ultimo = await page.evaluate(function () {
        var n = document.querySelector(".tour__next"); return !!n && n.textContent.length > 0 && document.querySelector(".tour__counter") &&
          /(\d+)\D+(\d+)/.test(document.querySelector(".tour__counter").textContent) &&
          RegExp.$1 === RegExp.$2;
      });
      await clic(".tour__next"); await dormir(250);
      if (ultimo) break;
    }
    await dormir(300);
  });

  // 5. La aplicación ya con su plan. En el móvil cada sección vive en una
  //    pestaña y las demás están escondidas, así que se recorren una a una.
  async function irA(destino) {
    if (!vista.movil) return;
    await page.evaluate(function (d) { if (typeof activarPestana === "function") activarPestana(d, true); }, destino);
    await dormir(200);
  }
  async function porPestanas(nombre, destinos) {
    if (!vista.movil) { await foto(nombre); return; }
    for (var i = 0; i < destinos.length; i++) {
      await irA(destinos[i]);
      await foto(nombre + "@" + destinos[i]);
    }
  }
  async function generar() {
    await irA("datos");
    await clic('#plannerForm button[type="submit"]');
    await page.waitForFunction(function () {
      return !document.getElementById("spinnerWrap") ||
        !document.getElementById("spinnerWrap").classList.contains("show");
    }, null, { timeout: 20000 }).catch(function () {});
    await dormir(900);
  }
  async function ajustarFormulario(cambios) {
    await page.evaluate(function (c) {
      Object.keys(c).forEach(function (id) {
        if (id === "budgetMode") {
          var r = document.querySelector('input[name="budgetMode"][value="' + c[id] + '"]');
          if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
          return;
        }
        var el = document.getElementById(id);
        if (!el) return;
        el.value = c[id];
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }, cambios);
  }
  async function dias(n) {
    await irA("datos");
    await clic('.plan-days__btn[data-days="' + n + '"]');
    await dormir(200);
  }

  await intentar("app-con-plan", async function () {
    await porPestanas("app", ["menu", "compra", "planes", "datos"]);
  });

  await intentar("ajustes", async function () {
    await clic("#ajustesBtn"); await dormir(300);
    await foto("ajustes");
    await clic("#ajustesCloseBtn"); await dormir(200);
  });

  await intentar("perfil", async function () {
    await clic("#authProfileBtn"); await dormir(300);
    await foto("perfil-acceso");
    await clic("#authDialogCloseBtn"); await dormir(200);
  });

  // Avisos del motor: un día imposible de verdad (volumen con el tramo más
  // bajo), con uno, tres y siete días, y con poco tiempo de cocina.
  await intentar("avisos", async function () {
    await ajustarFormulario({ goal: "bulk", budgetMode: "minimal", cookTime: "10", taste: "sweet" });
    await dias(1);
    await foto("un-dia-nota");
    await generar();
    await porPestanas("aviso-1-dia", ["menu"]);
    await dias(3); await generar();
    await porPestanas("aviso-3-dias", ["menu", "compra"]);
    await dias(7); await generar();
    await porPestanas("aviso-7-dias", ["menu"]);
    await ajustarFormulario({ goal: "cut", budgetMode: "small", cookTime: "20", taste: "mixed" });
    await generar();
    await porPestanas("aviso-corte", ["menu"]);
  });

  // Validación del formulario (calculator.js): edad fuera de rango.
  await intentar("validacion", async function () {
    await ajustarFormulario({ age: "5" });
    await generar();
    await foto("validacion-edad");
    await ajustarFormulario({ age: "28" });
  });

  await intentar("cambiar-toma", async function () {
    await ajustarFormulario({ goal: "bulk", budgetMode: "medium", cookTime: "35" });
    await dias(1); await generar();
    await irA("menu");
    await clic('button[data-action="swap-plan-meal"]'); await dormir(500);
    await foto("tras-cambiar-toma");
  });

  await intentar("sin-cocinar", async function () {
    await irA("datos");
    await clic("#noCookBtn"); await dormir(1200);
    await foto("sin-cocinar");
    await clic('button[data-action="swap-nocook-slot"]'); await dormir(500);
    await foto("sin-cocinar-cambiada");
    await clic("#usePlanTodayNoCookBtn"); await dormir(600);
    await porPestanas("sin-cocinar-confirmado", ["menu", "planes"]);
  });

  await intentar("compartir-lista", async function () {
    await irA("compra");
    await clic("#shareListBtn"); await dormir(700);
    await foto("compartir-lista");
  });

  await intentar("confirmar-plan", async function () {
    await irA("datos");
    await ajustarFormulario({ goal: "maintain", budgetMode: "medium" });
    await dias(1); await generar();
    await irA("compra");
    await clic("#usePlanTodayBtn"); await dormir(700);
    await porPestanas("plan-confirmado", ["compra", "planes"]);
  });

  await intentar("mis-planes", async function () {
    await irA("planes");
    var acciones = ["toggle-checklist", "confirm-purchase-all", "toggle-purchase-check",
      "toggle-meal-cooked", "regenerate-single-meal", "toggle-nocook-slot-consumed"];
    for (var i = 0; i < acciones.length; i++) {
      var sel = 'button[data-action="' + acciones[i] + '"], input[data-action="' + acciones[i] + '"]';
      if (await existe(sel)) {
        try { await page.locator(sel).first().click({ timeout: 2000 }); } catch (e) { /* tapado */ }
        await dormir(400);
        await foto("planes-" + acciones[i]);
      }
    }
    // Otro día de la tira de fechas.
    var chips = page.locator("#dateStrip label, #dateStrip button");
    if ((await chips.count()) > 1) {
      await chips.nth(1).click({ timeout: 2000 }).catch(function () {});
      await dormir(300);
      await foto("planes-otro-dia");
    }
  });

  await intentar("despensa", async function () {
    await irA("datos");
    await clic("#despensaBtn"); await dormir(300);
    await foto("despensa");
    await page.fill("#pantryAddName", "Arroz blanco cocido");
    await clic("#pantryAddBtn"); await dormir(200);
    await foto("despensa-sin-gramos");
    await page.fill("#pantryAddGrams", "500");
    await clic("#pantryAddBtn"); await dormir(400);
    await foto("despensa-con-producto");
    for (var i = 0; i < 2; i++) {
      var acc = ["edit", "expiry"][i];
      var s = 'button[data-action="' + acc + '"]';
      if (await existe(s)) { await page.locator(s).first().click({ timeout: 2000 }).catch(function () {}); await dormir(300); await foto("despensa-" + acc); }
    }
    await clic("#pantryCloseBtn"); await dormir(200);
  });

  await intentar("catalogo", async function () {
    await irA("compra");
    await page.evaluate(function () { var d = document.getElementById("verifiedPanel"); if (d) d.open = true; });
    await dormir(300);
    await foto("catalogo");
    await page.fill("#verifiedSearchInput", "yogur"); await dormir(400);
    await foto("catalogo-yogur");
    await page.fill("#verifiedSearchInput", "zzzzzz"); await dormir(400);
    await foto("catalogo-vacio");
  });

  await intentar("reiniciar", async function () {
    await irA("datos");
    await clic("#resetBtn"); await dormir(500);
    await porPestanas("tras-resetear", ["menu", "datos"]);
  });

  return pasos;
}

module.exports = { analizar: analizar };

if (require.main === module) {
  principal().catch(function (e) { console.error(e); process.exit(2); });
}

async function principal() {
  var pw = cargarPlaywright();
  var srv = null, base = URL_EXTERNA;
  if (!base) { srv = await servir(); base = "http://127.0.0.1:" + srv.address().port; }
  var browser = await pw.chromium.launch({ executablePath: rutaChromium(), args: ["--no-sandbox"] });
  var hallazgos = [];
  var fallos = [];
  var vistas = [];
  if (!SOLO_MOVIL) vistas.push({ nombre: "escritorio", w: 1280, h: 900, movil: false });
  if (!SOLO_ESCRITORIO) vistas.push({ nombre: "movil", w: 390, h: 844, movil: true });

  for (var li = 0; li < IDIOMAS.length; li++) {
    for (var vi = 0; vi < vistas.length; vi++) {
      var lang = IDIOMAS[li], vista = vistas[vi];
      var etiqueta = lang + "/" + vista.nombre;
      var ctx = await browser.newContext({ viewport: { width: vista.w, height: vista.h }, locale: lang });
      var page = await ctx.newPage();
      page.on("pageerror", function (e) { fallos.push(etiqueta + " :: error de página :: " + e.message); });
      await page.addInitScript(function (l) { try { localStorage.setItem("nutritionPlanner.lang.v1", l); } catch (e) {} }, lang);
      await page.addInitScript(gsapDeMentira);
      var instantanea = {
        fallos: fallos,
        tomar: async function (nombre) {
          var items = await page.evaluate(recogerTextos, { producto: PRODUCTO_SELECTORES });
          if (CAPTURAS) {
            var dir = path.join(REPO, "scripts/i18n/capturas");
            fs.mkdirSync(dir, { recursive: true });
            await page.screenshot({ path: path.join(dir, lang + "-" + vista.nombre + "-" + nombre + ".png") });
          }
          items.forEach(function (it) {
            if (it.prod) return;
            if (!it.v && !VER_OCULTO) return;
            if (IGNORA && IGNORA.test(it.e)) return;
            var motivos = analizar(it, lang);
            if (motivos.length) hallazgos.push({ idioma: lang, vista: vista.nombre, paso: nombre, texto: it.t, donde: it.e, tipo: it.k, visible: it.v, motivo: motivos.join("; ") });
          });
        }
      };
      await page.goto(base + "/index.html");
      await recorrer(page, lang, etiqueta, instantanea, vista);
      await ctx.close();
    }
  }
  await browser.close();
  if (srv) srv.close();

  // Agrupa lo repetido: el mismo texto en el mismo sitio sale en veinte pasos.
  var grupos = {};
  hallazgos.forEach(function (h) {
    var clave = [h.idioma, h.texto, h.donde].join("|");
    if (!grupos[clave]) { grupos[clave] = h; h.pasos = []; h.vistas = []; }
    if (grupos[clave].pasos.indexOf(h.paso) === -1) grupos[clave].pasos.push(h.paso);
    if (grupos[clave].vistas.indexOf(h.vista) === -1) grupos[clave].vistas.push(h.vista);
  });
  var lista = Object.keys(grupos).map(function (k) { return grupos[k]; });

  if (SALIDA_JSON) {
    console.log(JSON.stringify({ hallazgos: lista, fallos: fallos }, null, 2));
  } else if (RESUMEN) {
    // Una línea por ELEMENTO (su ruta), con cuántos textos distintos y tres de ejemplo:
    // veinte "840 g" distintos son un solo fallo en el código.
    var porSitio = {};
    lista.forEach(function (h) {
      var k = h.idioma + " " + h.donde;
      if (!porSitio[k]) porSitio[k] = { n: 0, ej: [], motivo: h.motivo, tipo: h.tipo };
      porSitio[k].n++;
      if (porSitio[k].ej.length < 3) porSitio[k].ej.push(h.texto.length > 60 ? h.texto.slice(0, 57) + "..." : h.texto);
    });
    Object.keys(porSitio).forEach(function (k) {
      var x = porSitio[k];
      console.log(String(x.n).padStart(4) + "  " + k + "  (" + x.tipo + ")");
      console.log("        " + x.motivo + "   ej: " + x.ej.map(function (e) { return JSON.stringify(e); }).join(" | "));
    });
    console.log("\n" + lista.length + " hallazgos, " + Object.keys(porSitio).length + " sitios");
    if (fallos.length) {
      console.log("\nPASOS QUE NO SE PUDIERON HACER (" + fallos.length + "):");
      fallos.forEach(function (f) { console.log("  " + f); });
    }
  } else {
    lista.forEach(function (h) {
      console.log("[" + h.idioma + "] " + JSON.stringify(h.texto));
      console.log("      " + h.motivo + "   (" + h.tipo + (h.visible ? "" : ", oculto") + ")");
      console.log("      " + h.donde);
      console.log("      en: " + h.pasos.slice(0, 6).join(", ") + (h.pasos.length > 6 ? " +" + (h.pasos.length - 6) : "") + "  [" + h.vistas.join(",") + "]");
    });
    console.log("\n" + lista.length + " hallazgos en " + IDIOMAS.join("+"));
    if (fallos.length) {
      console.log("\nPASOS QUE NO SE PUDIERON HACER (" + fallos.length + "):");
      fallos.forEach(function (f) { console.log("  " + f); });
    }
  }
  process.exit(lista.length ? 1 : 0);
}
