/**
 * js/i18n/packages-en.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las etiquetas de ENVASE y de RACION, en ingles: [singular, plural].
 *
 * Describen COMO se compra algo -- una barra, un tarro, una bandeja -- y no
 * son el nombre comercial del producto, asi que se traducen. "Buy: 1 barra"
 * no le dice nada a quien no sabe español, y es justo la linea que hay que
 * leer estando de pie en el supermercado.
 *
 * Van en pares porque el ingles no forma el plural añadiendo una "s":
 * loaf/loaves, box/boxes, tray/trays. La clave es la etiqueta española
 * entera, incluidas las que llevan una aclaracion entre parentesis, para
 * que este fichero se lea en paralelo con js/data/packaging.js.
 *
 * Sin traduccion para una etiqueta, `tPackageLabel()` devuelve null y quien
 * llama se queda con el español y su plural de siempre.
 * ─────────────────────────────────────────────────────────────────────────
 */

registerPackageTable("en", {
  // ── Piezas que se compran de una en una ──────────────────────────────
  "aguacate":   ["avocado", "avocados"],
  "batata":     ["sweet potato", "sweet potatoes"],
  "brócoli":    ["head of broccoli", "heads of broccoli"],
  "calabacín":  ["courgette", "courgettes"],
  "coliflor":   ["cauliflower", "cauliflowers"],
  "kiwi":       ["kiwi", "kiwis"],
  "manzana":    ["apple", "apples"],
  "naranja":    ["orange", "oranges"],
  "pepino":     ["cucumber", "cucumbers"],
  "pimiento":   ["pepper", "peppers"],
  "piña":       ["pineapple", "pineapples"],
  "plátano":    ["banana", "bananas"],
  "tomate":     ["tomato", "tomatoes"],

  // ── Envases ──────────────────────────────────────────────────────────
  "bandeja":    ["tray", "trays"],
  "barra":      ["loaf", "loaves"],
  "bolsa":      ["bag", "bags"],
  "botella":    ["bottle", "bottles"],
  "brick":      ["carton", "cartons"],
  "caja":       ["box", "boxes"],
  "hogaza":     ["round loaf", "round loaves"],
  "malla":      ["net", "nets"],
  "paquete":    ["pack", "packs"],
  "tarrina":    ["tub", "tubs"],
  "tarro":      ["jar", "jars"],

  // ── Con aclaracion: el peso escurrido, los cortes, lo que rinde ──────
  "bola (peso escurrido)":          ["ball (drained weight)", "balls (drained weight)"],
  "bolsa (cocida al vacío)":        ["bag (vacuum-cooked)", "bags (vacuum-cooked)"],
  "bote (peso escurrido)":          ["tin (drained weight)", "tins (drained weight)"],
  "paquete (escurrido)":            ["pack (drained)", "packs (drained)"],
  "pack de 2":                      ["pack of 2", "packs of 2"],
  "pack de 2 (escurrido)":          ["pack of 2 (drained)", "packs of 2 (drained)"],
  "pack de 3 (escurrido)":          ["pack of 3 (drained)", "packs of 3 (drained)"],
  "pack de 6":                      ["pack of 6", "packs of 6"],
  "pack de 6 (escurrido)":          ["pack of 6 (drained)", "packs of 6 (drained)"],
  "paquete de 12 lonchas":          ["pack of 12 slices", "packs of 12 slices"],
  "bandeja (media de 2 cortes)":    ["tray (2 portions on average)", "trays (2 portions on average)"],
  "bandeja (media de 3 cortes)":    ["tray (3 portions on average)", "trays (3 portions on average)"],
  "bandeja (media de 4 cortes)":    ["tray (4 portions on average)", "trays (4 portions on average)"],
  "bandeja (media de 5 cortes)":    ["tray (5 portions on average)", "trays (5 portions on average)"],
  "bandeja (media de 6 cortes)":    ["tray (6 portions on average)", "trays (6 portions on average)"],
  "paquete de 1 kg (rinde 2,3 kg cocido)":   ["1 kg pack (makes 2.3 kg cooked)", "1 kg packs (make 2.3 kg cooked)"],
  "paquete de 1 kg (rinde 2,8 kg cocido)":   ["1 kg pack (makes 2.8 kg cooked)", "1 kg packs (make 2.8 kg cooked)"],
  "paquete de 500 g (rinde 1,35 kg cocido)": ["500 g pack (makes 1.35 kg cooked)", "500 g packs (make 1.35 kg cooked)"],

  // ── Raciones de casa (js/data/servings.js, 2026-09-13) ───────────────
  // Estas NO son etiquetas de envase: son la unidad en la que uno SIRVE.
  // Comparten tabla porque comparten funcion (`tPackageLabel`) y porque las
  // piezas de fruta de arriba ya hacian de las dos cosas. `tests/servings.
  // test.js` exige que toda etiqueta de SERVING_UNITS este aqui: sin
  // traduccion saldria en español dentro de la interfaz inglesa, sin dar
  // ningun error (scripts/i18n/LEEME.md, la regla que lo explica todo).
  "bola":       ["ball", "balls"],
  "bote":       ["tin", "tins"],
  // "huevo", "cebolla" y "cucharadita" son las etiquetas de las ramas
  // perUnit y spoonable de packaging.js. Llevaban desde siempre saliendo en
  // español dentro de la interfaz inglesa ("1 y 1/2 huevos") porque esas
  // dos ramas escribían la etiqueta a pelo, sin pasar por el diccionario.
  "cebolla":     ["onion", "onions"],
  "clara":      ["egg white", "egg whites"],
  "cucharada":  ["tablespoon", "tablespoons"],
  "cucharadita": ["teaspoon", "teaspoons"],
  "huevo":       ["egg", "eggs"],
  "diente":     ["clove", "cloves"],
  "lata":       ["tin", "tins"],
  "loncha":     ["slice", "slices"],
  "patata":     ["potato", "potatoes"],
  "puñado":     ["handful", "handfuls"],
  "rebanada":   ["slice", "slices"],
  "rodaja":     ["slice", "slices"],
  "salchicha":  ["sausage", "sausages"],
  "tortilla":   ["tortilla", "tortillas"],
  "tortita":    ["rice cake", "rice cakes"],
  // "cup" y no "glass": en ingles de cocina el arroz y la leche se miden en
  // cups, y esta linea se lee cocinando. Los gramos exactos van al lado.
  "vaso":       ["cup", "cups"],
  "yogur":      ["yogurt", "yogurts"],
  "zanahoria":  ["carrot", "carrots"]
});
