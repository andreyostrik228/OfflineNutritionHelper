/**
 * tests/look.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * El ASPECTO: el diseño entero que el usuario elige en Ajustes
 * (js/core/look.js + assets/css/temas/*.css + el IIFE "ASPECTO" del <head>).
 *
 * Lo que se vigila, por orden de lo que cuesta no verlo:
 *
 *  1. El valor guardado acaba en un atributo del DOM y en la RUTA de una hoja
 *     de estilos: se valida contra la lista, y un id inventado ("../x") no
 *     llega nunca a una URL.
 *  2. El <head> repite la lista de ids (corre antes de pintar y no puede
 *     esperar a look.js). Si las dos copias se separan, un aspecto nuevo se
 *     ve en el menú pero no carga al abrir la página, o al revés.
 *  3. Cada hoja existe, cita solo tipografías que existen, y no tiene nada que
 *     el resto del proyecto prohíbe (animaciones que dejan invisible, @import
 *     o URLs externas: la aplicación es OFFLINE).
 *  4. Cada aspecto se lee: sus pares de color de texto/fondo llegan a 4,5:1.
 *     Es lo único que un aspecto no puede cambiar a su antojo.
 *  5. El aspecto por defecto va el primero (decisión del dueño: arriba a la
 *     izquierda) y no tiene hoja propia.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}
function leer(rel) {
  return fs.readFileSync(projPath(rel), "utf8");
}
function freshLookSandbox() {
  return loadBrowserGlobals([projPath("js/core/look.js")]);
}
function createFakeLocalStorage() {
  var data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}
/** Los ids de LOOKS como array del realm de los tests (el del sandbox es otro). */
function idsDe(s) {
  return JSON.parse(JSON.stringify(s.LOOKS)).map(function (l) { return l.id; });
}

// ── Contraste (misma fórmula WCAG que store-theme.test.js) ───────────────
function rgb(hex) {
  var h = hex.replace("#", "");
  return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); });
}
function lum(c) {
  var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contraste(a, b) {
  var x = lum(rgb(a)), y = lum(rgb(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Los tokens `--x: #rrggbb` del bloque :root del ASPECTO (el último del fichero). */
function tokensDelAspecto(css) {
  var desde = css.indexOf("/* ── el aspecto ── */");
  assert.ok(desde !== -1, "no se encuentra el marcador '── el aspecto ──'");
  var m = /:root\{([^}]*)\}/.exec(css.slice(desde));
  assert.ok(m, "el aspecto no declara su :root");
  var out = {}, re = /(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g, t;
  while ((t = re.exec(m[1]))) out[t[1]] = t[2];
  return out;
}

/** Los pares que la aplicación da por buenos en cualquier aspecto. */
var PARES = [
  ["--ink", "--canvas"], ["--ink", "--surface"], ["--ink", "--surface-2"],
  ["--text-2", "--canvas"], ["--text-2", "--surface"], ["--text-2", "--surface-2"],
  ["--text-3", "--canvas"], ["--text-3", "--surface"], ["--text-3", "--surface-2"],
  ["--on-ink", "--primary"], ["--on-ink-2", "--primary"],
  ["--on-volt", "--volt"], ["--on-volt", "--volt-hi"],
  ["--ink", "--volt-wash"], ["--text-2", "--volt-wash"],
  ["--ok", "--ok-wash"], ["--warn", "--warn-wash"], ["--danger-deep", "--danger-wash"],
  ["--kcal-deep", "--surface"], ["--protein-deep", "--surface"], ["--carbs-deep", "--surface"], ["--fat-deep", "--surface"],
  ["--kcal-deep", "--kcal-wash"], ["--protein-deep", "--protein-wash"], ["--carbs-deep", "--carbs-wash"], ["--fat-deep", "--fat-wash"]
];

function run(t) {

  // ── Validación: esto acaba en un atributo del DOM y en una URL ─────────

  t.test("sin nada guardado el aspecto es el de siempre, 'entreno'", function () {
    var s = freshLookSandbox();
    assert.strictEqual(s.DEFAULT_LOOK, "entreno");
    assert.strictEqual(s.getLook(), "entreno");
  });

  t.test("el aspecto por defecto va el PRIMERO (arriba a la izquierda) y no tiene hoja", function () {
    var s = freshLookSandbox();
    assert.strictEqual(s.LOOKS[0].id, s.DEFAULT_LOOK);
    assert.strictEqual(s.LOOKS[0].file, null);
    // y es el único sin hoja
    var sinHoja = JSON.parse(JSON.stringify(s.LOOKS)).filter(function (l) { return !l.file; });
    assert.strictEqual(sinHoja.length, 1);
  });

  t.test("un id inventado cae al aspecto por defecto y NO llega a una ruta", function () {
    var s = freshLookSandbox();
    ["../x", "hojas.css", "HOJAS", "hojas ", "", null, undefined, 7, {}, [], true, "javascript:alert(1)", "assets/css/temas/hojas"].forEach(function (basura) {
      assert.strictEqual(s.sanitizeLook(basura), "entreno", "deberia rechazar " + JSON.stringify(basura));
      assert.strictEqual(s.lookCssHref(basura, "20261006a"), null);
    });
  });

  t.test("localStorage con basura dentro devuelve el de siempre, no la basura", function () {
    var s = freshLookSandbox();
    s.localStorage = createFakeLocalStorage();
    s.localStorage.setItem("nutritionPlanner.look.v1", "<script>");
    assert.strictEqual(s.getLook(), "entreno");
  });

  t.test("guarda y devuelve cada aspecto de la lista", function () {
    idsDe(freshLookSandbox()).forEach(function (id) {
      var s = freshLookSandbox();
      s.localStorage = createFakeLocalStorage();
      assert.strictEqual(s.saveLook(id), id);
      assert.strictEqual(s.getLook(), id);
    });
  });

  t.test("saveLook devuelve lo que QUEDÓ, no lo que se pidió", function () {
    var s = freshLookSandbox();
    s.localStorage = createFakeLocalStorage();
    assert.strictEqual(s.saveLook("verde-lima"), "entreno");
    assert.strictEqual(s.getLook(), "entreno");
  });

  t.test("el aspecto vive en su PROPIA clave, no dentro de los ajustes", function () {
    var s = freshLookSandbox();
    s.localStorage = createFakeLocalStorage();
    s.saveLook("noche");
    assert.strictEqual(s.localStorage.getItem("nutritionPlanner.look.v1"), "noche");
    assert.strictEqual(s.localStorage.getItem("nutritionPlanner.settings.v1"), null);
  });

  t.test("sin localStorage, o con uno que LANZA, se recuerda en memoria y no rompe", function () {
    var s = freshLookSandbox();
    s.localStorage = undefined;
    assert.doesNotThrow(function () { s.saveLook("hojas"); });
    assert.strictEqual(s.getLook(), "hojas");
    var s2 = freshLookSandbox();
    s2.localStorage = {
      getItem: function () { throw new Error("bloqueado"); },
      setItem: function () { throw new Error("bloqueado"); }
    };
    assert.doesNotThrow(function () { s2.saveLook("noche"); });
    assert.strictEqual(s2.getLook(), "noche");
  });

  t.test("la URL de la hoja lleva el sello, y solo un sello válido", function () {
    var s = freshLookSandbox();
    assert.strictEqual(s.lookCssHref("hojas", "20261006a"), "assets/css/temas/hojas.css?v=20261006a");
    assert.strictEqual(s.lookCssHref("hojas"), "assets/css/temas/hojas.css");
    // un sello con símbolos no se cuela en la URL
    assert.strictEqual(s.lookCssHref("hojas", "1&x=<"), "assets/css/temas/hojas.css");
    assert.strictEqual(s.lookCssHref("entreno", "20261006a"), null);
  });

  // ── El <head> repite la lista ──────────────────────────────────────────

  t.test("el IIFE del <head> y look.js hablan de los MISMOS aspectos y colores", function () {
    var html = leer("index.html");
    var m = /var ASPECTOS = \{([\s\S]*?)\};/.exec(html);
    assert.ok(m, "no se encuentra `var ASPECTOS = {...}` en el <head>");
    var enHead = {}, re = /([a-z]+):\s*"(#[0-9a-fA-F]{6})"/g, p;
    while ((p = re.exec(m[1]))) enHead[p[1]] = p[2].toLowerCase();
    var s = freshLookSandbox();
    var enJs = {};
    JSON.parse(JSON.stringify(s.LOOKS)).forEach(function (l) { enJs[l.id] = l.color.toLowerCase(); });
    assert.deepStrictEqual(enHead, enJs,
      "la lista del <head> de index.html y LOOKS de js/core/look.js se han separado");
  });

  t.test("look.js se carga ANTES que render-menu.js, que lo usa", function () {
    var html = leer("index.html");
    var a = html.indexOf("js/core/look.js?v=");
    var b = html.indexOf("js/ui/render-menu.js?v=");
    assert.ok(a !== -1 && b !== -1 && a < b);
  });

  t.test("el menú de ajustes tiene el grupo de aspecto y el de tema sigue escondido", function () {
    var html = leer("index.html");
    assert.ok(/id="ajustesAspecto"[^>]*role="radiogroup"/.test(html));
    assert.ok(/<section class="ajustes-group" hidden>\s*<h3[^>]*id="ajustesTemaTitle"/.test(html),
      "el grupo 'Tema' (claro/oscuro) tiene que seguir con `hidden`");
    // el de aspecto va antes que el de idioma: es lo primero que se ve
    assert.ok(html.indexOf('id="ajustesAspectoGrupo"') < html.indexOf('id="ajustesIdioma"'));
  });

  // ── Las hojas ──────────────────────────────────────────────────────────

  t.test("cada aspecto con hoja la tiene, generada, y cada hoja tiene su aspecto", function () {
    var s = freshLookSandbox();
    var conHoja = JSON.parse(JSON.stringify(s.LOOKS)).filter(function (l) { return l.file; });
    var enDisco = fs.readdirSync(projPath("assets/css/temas")).filter(function (f) { return /\.css$/.test(f); }).sort();
    assert.deepStrictEqual(enDisco, conHoja.map(function (l) { return path.basename(l.file); }).sort(),
      "assets/css/temas/ y LOOKS no coinciden");
    conHoja.forEach(function (l) {
      var css = leer(l.file);
      assert.ok(css.indexOf("GENERADO por scripts/temas/construir.py") !== -1, l.file + ": falta la marca de generado");
      assert.ok(path.basename(l.file, ".css") === l.id, l.file + ": el nombre del fichero es el id");
    });
  });

  t.test("las hojas solo citan tipografías que existen, y nada externo", function () {
    var s = freshLookSandbox();
    JSON.parse(JSON.stringify(s.LOOKS)).filter(function (l) { return l.file; }).forEach(function (l) {
      var css = leer(l.file);
      var re = /url\("\.\.\/\.\.\/fonts\/([^"]+)"\)/g, m, n = 0;
      while ((m = re.exec(css))) {
        n++;
        assert.ok(fs.existsSync(projPath("assets/fonts/" + m[1])), l.file + ": falta assets/fonts/" + m[1]);
      }
      assert.ok(n > 0, l.file + " no declara ninguna tipografía");
      assert.strictEqual(/@import/.test(css), false, l.file + ": @import");
      assert.strictEqual(/url\(\s*["']?(https?:)?\/\//.test(css), false, l.file + ": URL externa (la aplicación es offline)");
    });
  });

  t.test("ninguna hoja de aspecto anima desde invisible reteniendo el primer fotograma", function () {
    var s = freshLookSandbox();
    JSON.parse(JSON.stringify(s.LOOKS)).filter(function (l) { return l.file; }).forEach(function (l) {
      var css = leer(l.file);
      var invisibles = [], re = /@keyframes\s+([A-Za-z0-9_-]+)\s*\{([\s\S]*?)\n\}/g, m;
      while ((m = re.exec(css))) {
        var primero = m[2].match(/(?:^|\n)\s*(?:from|0%)\s*\{([^}]*)\}/);
        if (primero && /opacity\s*:\s*0(?!\.\d*[1-9])/.test(primero[1])) invisibles.push(m[1]);
      }
      var uso = /animation:\s*([A-Za-z0-9_-]+)[^;]*\b(both|backwards)\b[^;]*;/g, u;
      while ((u = uso.exec(css))) {
        assert.strictEqual(invisibles.indexOf(u[1]), -1, l.file + ": " + u[1] + " deja el elemento invisible si no se ejecuta");
      }
    });
  });

  t.test("cada aspecto se lee: sus pares de texto/fondo llegan a 4,5:1", function () {
    var s = freshLookSandbox();
    JSON.parse(JSON.stringify(s.LOOKS)).filter(function (l) { return l.file; }).forEach(function (l) {
      var tok = tokensDelAspecto(leer(l.file));
      var fallos = [];
      PARES.forEach(function (par) {
        var a = tok[par[0]], b = tok[par[1]];
        if (!a || !b) { fallos.push(par.join(" sobre ") + " (sin definir)"); return; }
        var c = contraste(a, b);
        if (c < 4.5) fallos.push(par.join(" sobre ") + " = " + c.toFixed(2));
      });
      assert.deepStrictEqual(fallos, [], l.id + ": " + fallos.join("; "));
    });
  });

  t.test("el color de la barra del navegador es el lienzo de cada aspecto", function () {
    var s = freshLookSandbox();
    JSON.parse(JSON.stringify(s.LOOKS)).filter(function (l) { return l.file; }).forEach(function (l) {
      var tok = tokensDelAspecto(leer(l.file));
      assert.strictEqual(l.color.toLowerCase(), (tok["--canvas"] || "").toLowerCase(),
        l.id + ": `color` de LOOKS (theme-color) debería ser su --canvas");
    });
  });

  // ── Miniaturas y textos ────────────────────────────────────────────────

  t.test("cada aspecto tiene su miniatura y no pesa de más", function () {
    idsDe(freshLookSandbox()).forEach(function (id) {
      var f = projPath("assets/img/aspectos/" + id + ".webp");
      assert.ok(fs.existsSync(f), "falta la miniatura de " + id + " (node scripts/temas/vistas.js)");
      assert.ok(fs.statSync(f).size < 40 * 1024, "la miniatura de " + id + " pesa demasiado");
    });
  });

  t.test("cada aspecto tiene nombre en español, inglés y ruso", function () {
    var ids = idsDe(freshLookSandbox());
    ["es", "en", "ru"].forEach(function (lang) {
      var sb = loadBrowserGlobals([projPath("js/core/i18n.js"), projPath("js/i18n/" + lang + ".js")]);
      ids.concat(["__titulo"]).forEach(function (id) {
        var clave = id === "__titulo" ? "ui.aspecto" : "ui.aspecto_" + id;
        assert.ok(sb.t(clave, lang) && sb.t(clave, lang) !== clave, lang + ": falta " + clave);
      });
      assert.ok(sb.t("ui.aspecto_puesto", lang).indexOf("{nombre}") !== -1, lang + ": ui.aspecto_puesto sin {nombre}");
    });
  });
}

module.exports = { run: run };
