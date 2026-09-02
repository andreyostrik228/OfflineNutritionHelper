/**
 * tests/ingredient-packaging-coverage.test.js
 * ─────────────────────────────────────────────────────────────────────────
 * FASE 0 — test DIAGNÓSTICO de cobertura entre los ingredient roles reales
 * de js/data/dishes.js (DISH_DB) y el sistema de resolución de envase/
 * paquete que usa la lista de la compra (js/core/pricing.js:
 * resolvePackageInfo, con su cascada real-ingredient-matches.js →
 * packaging.js → "sin envase fijo conocido").
 *
 * Por qué existe: durante la revisión arquitectónica de esta sesión se
 * detectó que packaging.js declara en su propia cabecera cubrir "los 65
 * ingredientes de DISH_DB" -- una cifra desactualizada desde que el
 * dataset creció a 334 platos / 81 ingredient roles (ver STATE.md). Cruzar
 * programáticamente los 81 roles reales contra resolvePackageInfo() real
 * (no reimplementada) encontró 18 roles sin packageSizeG conocido que NO
 * están en la lista de "carne/pescado fresco" que packaging.js documenta
 * como excepción intencional -- es decir, un agujero de cobertura no
 * detectado hasta ahora, no una decisión de diseño.
 *
 * Este test NO corrige packaging.js (fuera del alcance de Fase 0, ver
 * ROADMAP.md — además, en la arquitectura B ya decidida, cada ingrediente
 * que se resuelva contra un producto real en Fase 1 hará irrelevante su
 * entrada aquí, así que parchear packaging.js ahora sería trabajo
 * desechable). Es puramente diagnóstico: fija la lista EXACTA de hoy como
 * línea base, para que:
 *
 *   a) si el agujero CRECE (se añade un plato nuevo con un ingrediente sin
 *      cobertura de envase), el test falla inmediatamente -- exactamente
 *      el fallo que pasó desapercibido la sesión en la que el dataset
 *      creció de 204 a 334 platos;
 *
 *   b) si el agujero SE REDUCE (Fase 1 resuelve alguno de estos 18 contra
 *      un producto real, o alguien completa packaging.js a mano), el test
 *      también falla -- obligando a actualizar la línea base de forma
 *      consciente y visible, nunca en silencio.
 *
 * NO modifica packaging.js / real-ingredient-matches.js / pricing.js /
 * dishes.js -- solo LEE y EJECUTA ese código real vía loadBrowserGlobals().
 * ─────────────────────────────────────────────────────────────────────────
 */

var assert = require("assert");
var path = require("path");
var loadBrowserGlobals = require("./lib/load-browser-globals").loadBrowserGlobals;

function projPath(rel) {
  return path.join(__dirname, "..", rel);
}

function freshSandbox() {
  return loadBrowserGlobals([
    projPath("js/data/dishes.js"),
    projPath("js/data/packaging.js"),
    projPath("js/data/real-ingredient-matches.js"),
    projPath("js/data/product-links.js"),
    projPath("js/data/prices/mercadona.js"),
    projPath("js/core/utils.js"),
    projPath("js/core/pricing.js")
  ]);
}

/**
 * Extrae los nombres de ingrediente ÚNICOS realmente usados en DISH_DB,
 * tal como aparecen (sin normalizar) -- mismo criterio que
 * poc/core/load-dishes.js: extractUniqueIngredientRoles(), reimplementado
 * aquí en vez de importado de poc/ para no acoplar los tests de producción
 * a los internos del PoC (ver regla "no tocar poc/**" de esta fase).
 *
 * @param {object[]} dishDb
 * @returns {string[]} nombres únicos, orden de primera aparición
 */
function extractUniqueIngredientNames(dishDb) {
  var seen = [];
  dishDb.forEach(function (dish) {
    (dish.items || []).forEach(function (ingredient) {
      if (seen.indexOf(ingredient.name) === -1) seen.push(ingredient.name);
    });
  });
  return seen;
}

// Línea base auditada en esta sesión (Fase 0, 2026-08-03) EJECUTANDO
// resolvePackageInfo() real (no una reimplementación) sobre los 81 roles:
// ingredientes cuyo packageSizeG resuelve a null (ni real-ingredient-
// matches.js con sizeG, ni packaging.js con packageG/gramsPerUnit) -- lo
// que hoy hace que la lista de la compra los muestre como "se compra al
// peso, sin envase fijo".
//
// De estos 25, un subconjunto es carne/pescado fresco que packaging.js
// documenta explícitamente en su propio comentario final como excepción
// intencional (se compra al peso real, sin envase fijo) -- verificado que
// SÍ caen aquí: Bacalao, Lomo de cerdo, Lubina, Merluza, Muslo de pollo
// deshuesado, Pechuga de pavo, Rape, Salmón, Solomillo de ternera, Ternera
// magra, Conejo (10-11 casos, coherentes con el diseño). El resto --
// Calabacín, Carne picada 5% grasa, Champiñones, Coliflor, Fresas, Gamba
// cocida, Jamón serrano, Kiwi, Langostino cocido, Pan de
// centeno, Pavo picado, Pimiento, Trigo sarraceno cocido -- son fruta que
// se compra por unidad (como plátano/manzana, que SÍ tienen entrada
// perUnit), productos empaquetados (pan, cereales cocidos) o congelados en
// bolsa, con alta probabilidad un hueco de cobertura real, no una decisión
// -- consistente con lo detectado en la revisión arquitectónica de esta
// sesión. Este test NO distingue programáticamente ambos grupos (packaging.js
// no lo modela como dato) -- fija el conjunto completo como línea base;
// la clasificación de arriba es para quien lea este archivo, no una
// aserción del test.
// Línea base ACTUALIZADA 2026-08-20d (known issue #7): 13 de los 14 huecos
// reales de la auditoría original (Fase 0, 2026-08-03) se cubrieron con
// entradas nuevas en packaging.js (ver su cabecera, sección "Añadidos
// 2026-08-20d") -- Calabacín/Kiwi/Pimiento (perUnit) y Carne picada 5%
// grasa/Champiñones/Coliflor/Fresas/Gamba cocida/Jamón serrano/Langostino
// cocido/Pan de centeno/Pavo picado/Trigo sarraceno cocido (fixedPackage).
// Quedan sin cubrir, a propósito: solo los de carne/pescado fresco, que se
// compran al peso real (clasificación 4 en la cabecera de packaging.js).
// 2026-09-02: "Lechuga: Pepino" YA NO ESTÁ. Era un nombre de ingrediente
// CORRUPTO en dishes.js (dos alimentos concatenados con ":", known issue
// desde 2026-08-03). Se corrigió en origen -- el plato usa "Lechuga", que
// sí tiene envase (bolsa de 250 g) y nutrición propia -- en vez de darle
// una entrada de envase a la clave corrupta, que habría tapado el síntoma
// equivocado.
// 2026-09-02: entra "Pechuga de pollo". Su tamaño de envase venía de
// REAL_INGREDIENT_MATCHES, que ya no decide el precio (ver la cascada en
// pricing.js: el catálogo reconstruido contra la API manda). Sin ese
// tamaño cae donde caen las otras once carnes y pescados frescos: se
// compra al peso. Es lo COHERENTE -- era la única carne fresca con un
// envase fijo, y encima heredado de un dato de agosto.
// 2026-09-02 (6): de 12 a 3. El usuario comprobó el cerdo en la tienda y
// no cuadraba: la app cobraba el precio de UN corte concreto y, al no tener
// envase, cobraba solo los gramos usados. Pero el lomo viene en bandeja
// cerrada de ~638 g -- nadie compra 150 g.
//
// Los que quedan son los tres que Mercadona vende DE VERDAD a granel, y el
// criterio no es una opinión: su ficha deja `unit_size` a null, o sea que
// no hay unidad de venta. Los otros nueve sí la tienen y pasaron a
// fixedPackage con el peso MEDIO de los cortes que promedian su precio.
var EXPECTED_NO_FIXED_PACKAGE = [
  "Bacalao",
  "Rape",
  "Salmón"
].sort();

// Línea base del tamaño del dataset -- si esto cambia, la lista de arriba
// necesita re-auditarse (este test lo detectará solo si el CONTEO de roles
// cambia; si el conteo se mantiene pero cambian los NOMBRES, lo detecta el
// test de abajo igualmente vía la comparación exacta de conjuntos).
// 2026-08-31: 81 -> 84. Los 14 platos españoles nuevos (T4) usan por
// primera vez cebolla, ajo y aceite de oliva como roles de ingrediente.
// Los tres resuelven CON envase en packaging.js (cebolla 150 g/unidad, ajo
// 5 g/diente, aceite 916 g/botella).
// 2026-09-02: 84 -> 83. Salen "Lechuga: Pepino" (nombre corrupto) y "Wrap
// proteico" (producto que Mercadona no vende: los 3 platos pasan a
// "Tortillas de trigo"); entra "Lechuga", con envase propio.
// 2026-09-02 (2): 83 -> 85. Entran "Salchichas" y "Pan blanco" con los 10
// platos baratos -- dos de los alimentos con más calorías por euro de
// Mercadona, y el catálogo no tenía ninguno de los dos. Los dos resuelven
// CON envase (paquete de 400 g y barra de 250 g), así que
// EXPECTED_NO_FIXED_PACKAGE no cambia.
// 2026-09-02 (2): 85 -> 83. Salen trigo sarraceno, tempeh y picada de
// pavo -- Mercadona no vende ninguno -- y entra "Carne picada mixta".
var EXPECTED_TOTAL_INGREDIENT_ROLES = 83;

function run(t) {
  var sandbox = freshSandbox();
  var ingredientNames = extractUniqueIngredientNames(sandbox.DISH_DB);

  t.test("línea base: DISH_DB tiene " + EXPECTED_TOTAL_INGREDIENT_ROLES + " ingredient roles únicos (si cambia, re-auditar cobertura de packaging.js)", function () {
    assert.strictEqual(
      ingredientNames.length, EXPECTED_TOTAL_INGREDIENT_ROLES,
      "DISH_DB tiene ahora " + ingredientNames.length + " roles únicos, no " + EXPECTED_TOTAL_INGREDIENT_ROLES +
      " -- el dataset cambió; la lista EXPECTED_NO_FIXED_PACKAGE de este archivo puede haber quedado desactualizada, revisar antes de fiarse del resto de tests"
    );
  });

  t.test("diagnóstico: la clasificación real de resolvePackageInfo() para los " + EXPECTED_TOTAL_INGREDIENT_ROLES + " roles coincide EXACTAMENTE con la línea base auditada en Fase 0", function () {
    var noFixedPackage = [];
    var withFixedPackage = [];

    ingredientNames.forEach(function (name) {
      var pkg = sandbox.resolvePackageInfo(name, "mercadona");
      if (pkg.packageSizeG === null) {
        noFixedPackage.push(name);
      } else {
        withFixedPackage.push(name);
      }
    });

    noFixedPackage.sort();

    // Log de diagnóstico visible al ejecutar la suite -- el propósito de
    // este test es informar, no solo pasar/fallar en silencio.
    console.log(
      "        [diagnóstico] " + withFixedPackage.length + "/" + ingredientNames.length +
      " roles con envase/paquete conocido, " + noFixedPackage.length + " sin envase fijo (al peso o hueco de cobertura)"
    );

    assert.deepStrictEqual(
      noFixedPackage, EXPECTED_NO_FIXED_PACKAGE,
      "La lista de roles sin envase fijo cambió respecto a la línea base de Fase 0.\n" +
      "        Antes (línea base, " + EXPECTED_NO_FIXED_PACKAGE.length + "): " + EXPECTED_NO_FIXED_PACKAGE.join(", ") + "\n" +
      "        Ahora (" + noFixedPackage.length + "): " + noFixedPackage.join(", ") + "\n" +
      "        Si CRECIÓ: un plato/ingrediente nuevo no tiene cobertura de packaging.js (mismo patrón que causó el hueco original).\n" +
      "        Si SE REDUJO: alguien resolvió/cubrió alguno de estos -- actualizar EXPECTED_NO_FIXED_PACKAGE a propósito."
    );
  });

  // ── El envase tiene que costar lo que cuesta en la tienda ────────────
  // Añadido 2026-09-02 por un fallo que reportó el usuario: "me dice que
  // compre 650 g de arroz y que gastaré 0,42 €, y el paquete vale 1,20".
  // El precio del rol va por gramo COCIDO y el tamaño de envase estaba en
  // gramos CRUDOS, así que el plan se inventaba paquetes de medio kilo de
  // arroz ya cocido, que no existen.
  //
  // La comprobación es que precio/100 g × tamaño del envase dé el precio
  // REAL del producto en la estantería. Si alguien vuelve a mezclar
  // unidades, este número deja de cuadrar inmediatamente.
  t.test("el precio del envase que calcula la app coincide con el precio real del producto en Mercadona", function () {
    var s = freshSandbox();
    // rol -> lo que cuesta de verdad ese paquete en la tienda (Granada,
    // 2026-09-02), verificado uno a uno contra la API.
    var REAL_SHELF_PRICE = {
      "Arroz blanco cocido":    1.20,  // Arroz largo Hacendado, 1 kg
      "Arroz integral cocido":  1.65,  // Arroz integral largo Hacendado, 1 kg
      "Pasta cocida":           1.15,  // Macarrón Hacendado, 1 kg
      "Cuscús cocido":          1.95,  // Cous cous mediano Hacendado, 1 kg
      "Quinoa cocida":          2.65,  // Quinoa Hacendado, 500 g
      "Lentejas cocidas":       0.90,  // Lenteja cocida Hacendado, bote
      "Alubias cocidas":        0.75,  // Alubia cocida blanca Hacendado, bote
      "Garbanzos cocidos":      0.80,  // Garbanzo cocido Hacendado, bote
      "Salchichas":             1.90,  // Salchichas cocidas bocata Hacendado, 400 g
      "Pan blanco":             0.50,  // Barra de pan, 250 g
      "Tortillas de trigo":     1.15,  // Tortillas de trigo Hacendado, 360 g
      "Huevos enteros":         3.05   // Huevos grandes L, docena
    };
    var off = [];
    Object.keys(REAL_SHELF_PRICE).forEach(function (name) {
      var pkg = s.resolvePackageInfo(name, "mercadona");
      if (!pkg || !pkg.packageSizeG) { off.push(name + ": sin envase"); return; }
      var diff = Math.abs(pkg.packagePrice - REAL_SHELF_PRICE[name]);
      if (diff > 0.03) {
        off.push(name + ": la app cobra " + pkg.packagePrice + " EUR por el envase (" +
          Math.round(pkg.packageSizeG) + " g) y en la tienda vale " + REAL_SHELF_PRICE[name]);
      }
    });
    assert.deepStrictEqual(off, [], off.join(" | "));
  });

  // ── El enlace tiene que llevar al producto que se está cobrando ──────
  // Añadido 2026-09-02: al pasar las legumbres del saco seco al bote, el
  // precio cambió y product-links.js se quedó apuntando al saco. El usuario
  // ya se había quejado justo de eso ("cuando entro por el enlace, ahí hay
  // otra cosa, otro gramaje").
  //
  // product-links.js se GENERA desde el comentario "// real: ..." de cada
  // precio, así que basta comprobar que el nombre del producto enlazado
  // sigue apareciendo en ese comentario. Si alguien cambia un precio y no
  // regenera los enlaces, esto falla en el acto.
  //
  // ── ENDURECIDO el 2026-09-02 (5): el solapamiento de palabras no basta ─
  // Este test estaba en verde mientras DOS enlaces iban al producto
  // equivocado, porque solo exigía compartir la mitad de las palabras
  // largas:
  //   · "carne picada 5% grasa" cobra 10,80 EUR/kg (bandeja de 1 kg) y
  //     enlazaba a la bandeja de 500 g a 11,00 -- mismas palabras, otro
  //     producto y otro gramaje.
  //   · "huevos enteros" cobra la DOCENA a 3,05 y enlazaba a la media
  //     docena a 3,60 -- el nombre del catálogo es idéntico en las dos.
  // Las palabras no distinguen formatos, y el formato es justo lo que el
  // usuario ve al abrir la ficha. Ahora se exige el nombre EXACTO, que es
  // la misma regla que usa el generador (corta el comentario en el primer
  // paréntesis), con una lista explícita de los roles cuyo comentario
  // abrevia a propósito.
  t.test("cada enlace de producto apunta al mismo producto del que sale su precio", function () {
    var fs = require("fs");
    var s = freshSandbox();
    if (typeof s.INGREDIENT_PRODUCT_LINKS === "undefined") {
      assert.fail("product-links.js no está cargado en el sandbox");
    }
    var priceText = fs.readFileSync(projPath("js/data/prices/mercadona.js"), "utf8");

    var norm = function (x) {
      return String(x || "").toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    };
    // rol -> comentario de su línea de precio
    var SPLIT_LINES = new RegExp(String.fromCharCode(13) + '?' + String.fromCharCode(10));
    var commentFor = {}, rawCommentFor = {};
    priceText.split(SPLIT_LINES).forEach(function (line) {
      var m = line.match(/^\s*"([^"]+)":\s*[0-9.]+,\s*\/\/\s*(.+)$/);
      if (m) { commentFor[m[1]] = norm(m[2]); rawCommentFor[m[1]] = m[2]; }
    });

    // Roles cuyo comentario de precio abrevia o parafrasea el nombre del
    // catálogo. Se escribieron a mano al reconstruir los precios y se
    // comprobaron uno a uno contra el volcado de Granada; van aquí para que
    // la comprobación de los otros 70+ pueda ser EXACTA en vez de difusa.
    var ABREVIA = {
      "copos de maiz": 1, "espinacas": 1, "pina": 1, "salmon": 1,
      "ternera magra": 1, "zanahoria": 1, "solomillo de ternera": 1,
      "rape": 1, "lentejas cocidas": 1, "alubias cocidas": 1
    };

    var off = [];
    Object.keys(s.INGREDIENT_PRODUCT_LINKS).forEach(function (role) {
      var linkedRaw = s.INGREDIENT_PRODUCT_LINKS[role].name;
      var linked = norm(linkedRaw);
      var comment = commentFor[role];
      if (!comment) { off.push(role + ": enlazado pero sin línea de precio"); return; }
      // Misma regla de corte que gen_product_links.js: el nombre del
      // producto va PRIMERO y termina en el primer paréntesis.
      var declared = norm(String(commentFor[role + "__raw"] || rawCommentFor[role] || "")
        .replace(/^real:\s*/i, "").replace(/\s*\(.*$/, ""));
      if (ABREVIA[role]) {
        // Aquí sí vale el solapamiento: el comentario no es el nombre.
        var words = linked.split(" ").filter(function (w) { return w.length > 3; });
        var shared = words.filter(function (w) { return comment.indexOf(w) !== -1; });
        if (!words.length || shared.length / words.length < 0.5) {
          off.push(role + " (abreviado): el enlace va a \"" + linkedRaw +
            "\" pero el precio sale de \"" + comment.slice(0, 46) + "\"");
        }
        return;
      }
      if (declared !== linked) {
        off.push(role + ": el enlace va a \"" + linkedRaw +
          "\" y el comentario del precio dice \"" + declared + "\"");
      }
    });
    assert.deepStrictEqual(off, [], off.join(" | "));
  });

  // ── Los 16 roles cuyo NOMBRE de catálogo está repetido ───────────────
  // Cuando dos productos se llaman igual, ninguna comprobación por texto
  // puede distinguirlos: "Huevos grandes L" es a la vez la docena a 3,05 y
  // la media docena a 3,60. El test de arriba estaba en verde con el
  // enlace en la media docena. Lo único que los separa es el id, así que
  // aquí se fija el id, con el formato que lo justifica al lado.
  //
  // Cada uno se eligió comprobando que el precio Y el gramaje que modela
  // la app coinciden con esa ficha (las diferencias aparentes son las
  // conversiones declaradas: peso escurrido en los botes, densidad del
  // aceite, rendimiento al cocer de la pasta).
  //
  // Si se vuelve a volcar el catálogo y un id se mueve, esto falla y hay
  // que volver a elegir A MANO -- que es lo correcto: es la decisión de
  // qué formato compra el usuario, no algo que deba adivinar un script.
  t.test("los productos con nombre repetido apuntan al formato correcto", function () {
    var s = freshSandbox();
    var ESPERADO = {
      "aceite de oliva":       ["4240",  "botella de 1 L, no la garrafa de 5 L"],
      "alubias cocidas":       ["26019", "bote grande (570 g), no el pequeño"],
      "carne picada 5% grasa": ["3454",  "bandeja de 1 kg a 10,80, no la de 500 g a 11,00"],
      "carne picada mixta":    ["3453",  "bandeja de 1 kg a 8,00, no la de 500 g a 8,20"],
      "cebolla":               ["69089", "malla de 1 kg, no la de 2 kg"],
      "claras de huevo":       ["31312", "botella de 1 L, no la de 300 ml"],
      "garbanzos cocidos":     ["26029", "bote grande (570 g), no el pequeño"],
      "huevos enteros":        ["31504", "DOCENA a 3,05, no la media docena a 3,60"],
      "langostino cocido":     ["87292", "bandeja de 600 g con precio cerrado"],
      "leche semidesnatada":   ["10382", "brick suelto de 1 L, no el pack de 6"],
      "lentejas cocidas":      ["26030", "bote grande (570 g), no el pequeño"],
      "maiz dulce":            ["16712", "pack de 3 latas, no el de 3 pequeñas"],
      "miel":                  ["15436", "tarro de 1 kg, no el de 500 g"],
      "pasta cocida":          ["6250",  "paquete de 1 kg a 1,15, no el de 500 g a 1,60"],
      "queso curado":          ["50968", "cuña grande; el rol no se usa en dishes.js"],
      "zanahoria":             ["69586", "bolsa de 1 kg, no la de 500 g"]
    };
    var off = [];
    Object.keys(ESPERADO).forEach(function (rol) {
      var link = s.INGREDIENT_PRODUCT_LINKS[rol];
      if (!link) { off.push(rol + ": sin enlace"); return; }
      if (link.id !== ESPERADO[rol][0]) {
        off.push(rol + ": id " + link.id + ", se esperaba " + ESPERADO[rol][0] +
          " (" + ESPERADO[rol][1] + ")");
      }
    });
    assert.deepStrictEqual(off, [], off.join(" | "));
  });

  // ── Precio medio => peso medio (regla del usuario, 2026-09-02) ───────
  // "Для всех таких продуктов, у которых указана средняя цена, используем
  // именно средний вес." Es decir: si el precio de un rol es la media de
  // varios cortes, el envase tiene que ser la media de ESOS MISMOS cortes,
  // no un número suelto. Si no, precio y peso hablan de cosas distintas y
  // vuelve a pasar lo del cerdo -- pagar el corte barato y llevarse otra
  // bandeja.
  //
  // El comentario del precio lleva las dos cifras escritas ("media de 5
  // cortes: 6,86 EUR/kg; bandeja media 638 g"), así que aquí se comprueba
  // que el fichero de precios y el de envases dicen lo mismo. El
  // comentario deja de ser decoración y pasa a ser el contrato, igual que
  // ya pasó con "// real:" y los enlaces.
  t.test("los roles con precio MEDIO llevan el peso medio de esos mismos cortes", function () {
    var fs = require("fs");
    var s = freshSandbox();
    var priceText = fs.readFileSync(projPath("js/data/prices/mercadona.js"), "utf8");
    var SPLIT = new RegExp(String.fromCharCode(13) + "?" + String.fromCharCode(10));

    var off = [], revisados = 0;
    priceText.split(SPLIT).forEach(function (line) {
      var m = line.match(/^\s*"([^"]+)":\s*([0-9.]+),\s*\/\/\s*real:\s*(.+)$/);
      if (!m) return;
      var role = m[1], per100 = parseFloat(m[2]), comment = m[3];

      var media = comment.match(/media de (\d+) cortes:\s*([\d,]+)\s*EUR\/kg/);
      var bandeja = comment.match(/bandeja(?: media)? (\d+) g/);
      var granel = /se vende a granel/.test(comment);
      if (!media && !bandeja && !granel) return;
      revisados++;

      var pkg = s.resolvePackageInfo(role, "mercadona");

      if (media) {
        var declarado = parseFloat(media[2].replace(",", "."));
        if (Math.abs(per100 * 10 - declarado) > 0.005) {
          off.push(role + ": cobra " + (per100 * 10).toFixed(3) +
            " EUR/kg pero su comentario declara una media de " + declarado);
        }
      }
      if (granel) {
        if (pkg && pkg.packageSizeG != null) {
          off.push(role + ": el comentario dice que se vende a granel, pero tiene envase de " +
            pkg.packageSizeG + " g");
        }
      } else if (bandeja) {
        var g = parseInt(bandeja[1], 10);
        if (!pkg || pkg.packageSizeG == null) {
          off.push(role + ": su precio declara bandeja de " + g + " g y no tiene entrada de envase");
        } else if (Math.round(pkg.packageSizeG) !== g) {
          off.push(role + ": envase de " + pkg.packageSizeG + " g, pero su precio declara " + g + " g");
        }
      }
    });

    assert.ok(revisados >= 12, "esperaba al menos 12 roles con media/granel declarados; hay " + revisados);
    assert.deepStrictEqual(off, [], off.join(" | "));
  });

  // ── Ningún rol se queda sin enlace ───────────────────────────────────
  // El botón 📷 sin id abre una búsqueda con muchos resultados, que es
  // exactamente la queja que originó product-links.js. Cinco roles la
  // recuperaron sin avisar el 2026-09-02, al reescribir sus comentarios de
  // precio con el formato equivocado.
  t.test("todos los roles de dishes.js tienen enlace directo a su producto", function () {
    var s = freshSandbox();
    var roles = {};
    s.DISH_DB.forEach(function (d) {
      d.items.forEach(function (i) { roles[s.normalizeIngredientKey(i.name)] = i.name; });
    });
    var sin = Object.keys(roles).filter(function (k) {
      return !s.INGREDIENT_PRODUCT_LINKS[k];
    }).map(function (k) { return roles[k]; });
    assert.deepStrictEqual(sin, [], "sin enlace: " + sin.join(", "));
  });
}

module.exports = { run: run };
