/**
 * tests/store-theme.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * El tema por tienda, y sobre todo la trampa que trae de serie.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────
 * Un tema de tienda se engancha con `data-store` en <html>, así que sus
 * reglas se escriben `:root[data-store="x"]`. Eso tiene especificidad
 * 0,2,0. El modo oscuro redefine los tokens sobre `:root` a secas: 0,1,0.
 *
 * La especificidad manda sobre el orden, así que un overlay de tienda
 * escrito para modo CLARO le gana al bloque oscuro. El fallo que produce
 * no es un color raro y evidente: es el verde claro de la tienda metido
 * en una pantalla oscura, con el contraste hundido, y solo en el móvil de
 * quien tenga esa tienda elegida. Nadie lo ve en el escritorio en claro,
 * que es donde se desarrolla.
 *
 * De ahí la regla que estos tests imponen: **todo token que un overlay
 * defina en claro lo tiene que definir también su gemelo oscuro**. Y como
 * el punto de un tema es cambiar colores, se mide además el contraste, no
 * se supone.
 *
 * Hoy no hay ningún overlay (Mercadona es el tema por defecto y vive en
 * `:root`), así que las comprobaciones 3-5 no tienen sujeto todavía. Son
 * la red: saltan el día que alguien añada la primera tienda, que es
 * exactamente cuando hace falta y cuando nadie se acuerda de esto.
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var fs = require("fs");
var path = require("path");

/** Los únicos tokens que una tienda puede tocar. Ver style.css. */
var TOKENS_DE_MARCA = [
  "--green", "--green-deep", "--green-wash", "--on-green",
  "--hero-bg-start", "--hero-bg-end"
];

/**
 * El verde VIVO de los fondos (2026-09-09). Va aparte porque vive SOLO en
 * `:root` y el modo oscuro lo hereda: un vivo con tinta oscura encima
 * funciona igual sobre papel claro que sobre papel oscuro, así que copiarlo
 * al bloque oscuro sería justo la duplicación que se desincroniza sola —
 * la misma razón por la que mercadona no tiene overlay.
 *
 * Por eso NO entra en TOKENS_DE_MARCA, cuya comprobación exige gemelo
 * oscuro. Una tienda sí puede redefinirlo, y si lo hace en claro y también
 * en oscuro, las reglas de overlay de más abajo le aplican igual.
 */
var TOKENS_DE_FONDO = ["--green-bright", "--green-bright-hi"];

/** Lo que NINGUNA tienda puede tocar: legibilidad e identidad del producto. */
var TOKENS_PROHIBIDOS = ["--ink", "--ink-soft", "--ink-faint", "--paper", "--paper-raised", "--line", "--line-strong"];

function leer(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

// ── Lectura del CSS ──────────────────────────────────────────────────────
// Sin librería de parseo: hace falta emparejar llaves y poco más, y meter
// una dependencia en un proyecto sin build para esto no sale a cuenta.

/** Cuerpo del bloque que empieza en la llave de `desde`, con llaves anidadas. */
function cuerpoDesde(css, desde) {
  var abre = css.indexOf("{", desde);
  if (abre === -1) return null;
  var nivel = 0;
  for (var i = abre; i < css.length; i++) {
    if (css[i] === "{") nivel++;
    else if (css[i] === "}") {
      nivel--;
      if (nivel === 0) return { cuerpo: css.slice(abre + 1, i), fin: i };
    }
  }
  return null;
}

/** Quita los comentarios: dentro hay ejemplos de código que no son reglas. */
function sinComentarios(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * El selector del tema oscuro. Desde el 2026-09-10 el modo oscuro NO cuelga
 * de `@media (prefers-color-scheme: dark)` sino de un atributo que pone el
 * usuario desde el menu de ajustes -- la preferencia del sistema le llegaba
 * al dueno como una imposicion. "Del sistema" sigue existiendo como opcion,
 * pero la resuelve el JavaScript y escribe aqui el valor ya resuelto, para
 * que los valores oscuros vivan en UN solo bloque.
 */
var SEL_OSCURO = ':root[data-theme="oscuro"]';

/** Declaraciones `--token: valor` de un cuerpo de regla. */
function tokensDe(cuerpo) {
  var out = {}, re = /(--[a-z0-9-]+)\s*:\s*([^;}]+)/gi, m;
  while ((m = re.exec(cuerpo))) out[m[1]] = m[2].trim();
  return out;
}

/** Reglas cuyo selector es exactamente `selector`, en el CSS dado. */
function reglas(css, selector) {
  var out = [], idx = 0;
  var escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var re = new RegExp("(?:^|[},])\\s*" + escapado + "\\s*\\{", "g");
  var m;
  while ((m = re.exec(css))) {
    var b = cuerpoDesde(css, m.index + m[0].length - 1);
    if (b) { out.push(b.cuerpo); re.lastIndex = b.fin; }
  }
  return out;
}

/**
 * Los overlays de tienda, con su id.
 *
 *   claro:   :root[data-store="x"]
 *   oscuro:  :root[data-theme="oscuro"][data-store="x"]
 *
 * La forma oscura la fija esta funcion porque todavia no hay ninguna tienda
 * con tema propio: cuando llegue la primera, este es el molde, y los tests
 * de mas abajo exigen que quien escriba la clara escriba tambien la oscura.
 */
function overlaysDeTienda(css, oscuro) {
  var out = [];
  var re = oscuro
    ? /:root\[data-theme\s*=\s*"oscuro"\]\[data-store\s*=\s*"([a-z0-9-]+)"\]\s*\{/g
    : /:root\[data-store\s*=\s*"([a-z0-9-]+)"\]\s*\{/g;
  var m;
  while ((m = re.exec(css))) {
    var b = cuerpoDesde(css, m.index + m[0].length - 1);
    if (b) { out.push({ tienda: m[1], tokens: tokensDe(b.cuerpo) }); re.lastIndex = b.fin; }
  }
  return out;
}

// ── Contraste WCAG ───────────────────────────────────────────────────────
function aRgb(color) {
  var c = String(color).trim();
  var h = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (h) {
    var d = h[1];
    if (d.length === 3) d = d[0] + d[0] + d[1] + d[1] + d[2] + d[2];
    return [parseInt(d.slice(0, 2), 16), parseInt(d.slice(2, 4), 16), parseInt(d.slice(4, 6), 16), 1];
  }
  var r = c.match(/^rgba?\(([^)]+)\)$/i);
  if (r) {
    var p = r[1].split(",").map(function (x) { return parseFloat(x); });
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return null;
}

/** Compone `frente` (que puede llevar alfa) sobre `fondo`, ambos opacos ya. */
function componer(frente, fondo) {
  if (frente[3] >= 1) return frente;
  return [0, 1, 2].map(function (i) { return frente[i] * frente[3] + fondo[i] * (1 - frente[3]); }).concat([1]);
}

function luminancia(rgb) {
  var c = rgb.slice(0, 3).map(function (v) {
    var s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contraste(textoCss, fondoCss) {
  var fondo = aRgb(fondoCss), texto = aRgb(textoCss);
  if (!fondo || !texto) return null;
  var t = componer(texto, fondo);
  var a = luminancia(t), b = luminancia(fondo);
  var hi = Math.max(a, b), lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

function run(t) {
  var css = sinComentarios(leer("assets/css/style.css"));
  var html = leer("index.html");

  // Los `:root` SUELTOS son el tema claro. `reglas()` exige que la llave
  // venga justo detras del selector, asi que `:root[data-theme="oscuro"] {`
  // no cae aqui: son dos conjuntos disjuntos sin tener que recortar nada.
  // El `:root` de --sbw tambien sale aqui y se fusiona, que es justo lo que
  // hace el navegador.
  var rootClaro = {};
  reglas(css, ":root").forEach(function (c) {
    var tk = tokensDe(c);
    Object.keys(tk).forEach(function (k) { rootClaro[k] = tk[k]; });
  });
  var rootOscuro = {};
  reglas(css, SEL_OSCURO).forEach(function (c) {
    var tk = tokensDe(c);
    Object.keys(tk).forEach(function (k) { rootOscuro[k] = tk[k]; });
  });
  var cssClaro = css;

  // ── 1. El contrato existe de verdad ────────────────────────────────────
  // Si alguien renombra --green, el tema de tienda apunta al vacío y no se
  // entera nadie: el overlay simplemente no haría nada.
  t.test("los tokens de marca existen en :root y en el bloque oscuro", function () {
    TOKENS_DE_MARCA.forEach(function (tok) {
      assert.ok(rootClaro[tok], "falta " + tok + " en :root -- ¿renombrado?");
      assert.ok(rootOscuro[tok], "falta " + tok + " en el bloque oscuro -- ¿renombrado?");
    });
  });

  // ── 2. El tema por defecto se lee, en los dos modos ───────────────────
  // No es decorativo: --on-green es la TINTA que va sobre un fondo verde, y
  // ese fondo ya no es --green sino --green-bright (2026-09-09). El cruce de
  // modos rompió el contraste una vez y por eso se mide, no se supone.
  t.test("--on-green sobre los verdes de FONDO cumple 4,5:1 en los dos modos", function () {
    TOKENS_DE_FONDO.forEach(function (tok) {
      var fondoClaro = rootClaro[tok];
      assert.ok(fondoClaro, "falta " + tok + " en :root -- ¿renombrado?");
      // El oscuro HEREDA salvo que lo redefina; se comprueba lo que de
      // verdad se aplicaría en cada modo.
      var fondoOscuro = rootOscuro[tok] || fondoClaro;
      var claro = contraste(rootClaro["--on-green"], fondoClaro);
      var oscuro = contraste(rootOscuro["--on-green"] || rootClaro["--on-green"], fondoOscuro);
      assert.ok(claro >= 4.5, tok + " en claro da " + claro.toFixed(2) + ":1");
      assert.ok(oscuro >= 4.5, tok + " en oscuro da " + oscuro.toFixed(2) + ":1");
    });
  });

  // ── 2 bis. Y --green sigue siendo legible como TEXTO ──────────────────
  // Es su papel desde que el fondo se mudó a --green-bright: 27 usos como
  // color de texto. Este es EL límite que impide poner el verde vivo aquí
  // (daría 4,11:1), así que queda medido para que nadie lo intente sin ver
  // la cifra.
  t.test("--green sobre --paper cumple 4,5:1 como texto, en los dos modos", function () {
    var claro = contraste(rootClaro["--green"], rootClaro["--paper"]);
    var oscuro = contraste(rootOscuro["--green"], rootOscuro["--paper"]);
    assert.ok(claro >= 4.5, "en claro da " + claro.toFixed(2) + ":1");
    assert.ok(oscuro >= 4.5, "en oscuro da " + oscuro.toFixed(2) + ":1");
  });

  // ── 3. LA TRAMPA: claro sin gemelo oscuro ─────────────────────────────
  var claros = overlaysDeTienda(cssClaro, false);
  var oscurosPorTienda = {};
  overlaysDeTienda(css, true).forEach(function (o) {
    oscurosPorTienda[o.tienda] = Object.assign(oscurosPorTienda[o.tienda] || {}, o.tokens);
  });

  t.test("cada overlay de tienda en claro define los MISMOS tokens en oscuro", function () {
    claros.forEach(function (o) {
      var gemelo = oscurosPorTienda[o.tienda];
      assert.ok(gemelo,
        'la tienda "' + o.tienda + '" tiene tema claro y NO tiene tema oscuro: ' +
        'por especificidad (0,2,0 contra 0,1,0) sus colores claros se colarán en modo oscuro');
      var enClaro = Object.keys(o.tokens).sort();
      var enOscuro = Object.keys(gemelo).sort();
      var huerfanos = enClaro.filter(function (k) { return enOscuro.indexOf(k) === -1; });
      assert.deepStrictEqual(huerfanos, [],
        'la tienda "' + o.tienda + '" define en claro y no en oscuro: ' + huerfanos.join(", ") +
        " -- esos valores claros ganarán al modo oscuro");
    });
  });

  // ── 4. Una tienda no puede tocar la legibilidad ───────────────────────
  t.test("ningún overlay toca los tokens de tinta, papel o líneas", function () {
    claros.concat(Object.keys(oscurosPorTienda).map(function (k) {
      return { tienda: k, tokens: oscurosPorTienda[k] };
    })).forEach(function (o) {
      Object.keys(o.tokens).forEach(function (tok) {
        assert.strictEqual(TOKENS_PROHIBIDOS.indexOf(tok), -1,
          'la tienda "' + o.tienda + '" redefine ' + tok + ": eso es identidad del producto y legibilidad, no del supermercado");
        assert.ok(TOKENS_DE_MARCA.concat(TOKENS_DE_FONDO).indexOf(tok) !== -1,
          'la tienda "' + o.tienda + '" redefine ' + tok + ", que no está en la lista de tokens de marca");
      });
    });
  });

  // ── 5. Y el contraste de cada tienda, medido ──────────────────────────
  t.test("cada tienda mantiene 4,5:1 de --on-green sobre su verde de fondo", function () {
    claros.forEach(function (o) {
      TOKENS_DE_FONDO.forEach(function (tok) {
        var verde = o.tokens[tok] || rootClaro[tok];
        var tinta = o.tokens["--on-green"] || rootClaro["--on-green"];
        var r = contraste(tinta, verde);
        assert.ok(r !== null, 'colores no interpretables en "' + o.tienda + '" (' + tok + ")");
        assert.ok(r >= 4.5, 'la tienda "' + o.tienda + '" da ' + r.toFixed(2) + ":1 en claro (" + tok + ")");
      });
    });
    Object.keys(oscurosPorTienda).forEach(function (id) {
      var tk = oscurosPorTienda[id];
      TOKENS_DE_FONDO.forEach(function (tok) {
        var verde = tk[tok] || rootOscuro[tok] || rootClaro[tok];
        var tinta = tk["--on-green"] || rootOscuro["--on-green"];
        var r = contraste(tinta, verde);
        assert.ok(r !== null, 'colores no interpretables en "' + id + '" (oscuro, ' + tok + ")");
        assert.ok(r >= 4.5, 'la tienda "' + id + '" da ' + r.toFixed(2) + ":1 en oscuro (" + tok + ")");
      });
    });
  });

  // ── 6. El enganche existe y se pone antes de pintar ───────────────────
  t.test("index.html pone data-store en <html> desde el <head>", function () {
    var cabeza = html.slice(0, html.indexOf("</head>"));
    assert.ok(/setAttribute\(\s*"data-store"/.test(cabeza),
      "data-store tiene que ponerse en el <head>: si se pone al cargar app.js, la página parpadea del tema por defecto al de la tienda");
  });

  t.test("el valor guardado se valida antes de llegar al DOM", function () {
    var cabeza = html.slice(0, html.indexOf("</head>"));
    assert.ok(/\/\^\[a-z0-9-\]\{1,32\}\$\//.test(cabeza),
      "el id de tienda viene de localStorage y acaba en un atributo del DOM: hay que validarlo");
  });

  t.test('sin tienda guardada el atributo vale "mercadona"', function () {
    var cabeza = html.slice(0, html.indexOf("</head>"));
    assert.ok(/POR_DEFECTO\s*=\s*"mercadona"/.test(cabeza),
      "el valor por defecto tiene que coincidir con DEFAULT_STORE_ID de pricing.js");
  });

  // ── 7. Hoy no cambia nada, y eso es comprobable ───────────────────────
  t.test("mercadona no tiene overlay: es el tema por defecto, no una copia", function () {
    var conOverlay = claros.concat(Object.keys(oscurosPorTienda).map(function (k) { return { tienda: k }; }))
      .filter(function (o) { return o.tienda === "mercadona"; });
    assert.deepStrictEqual(conOverlay, [],
      "Mercadona vive en :root. Un overlay que repita esos valores se desincroniza en cuanto alguien retoque :root");
  });
}

module.exports = { run: run };
