/**
 * js/i18n/packages-uk.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las etiquetas de ENVASE y de RACION, en ucraniano.
 *
 * Mismo contenido que packages-en.js y packages-ru.js (el test exige las
 * MISMAS claves), pero no en pares: el ucraniano cambia la palabra con el
 * número, y en cuatro formas, que son las categorías de plural de CLDR:
 *
 *   one    1, 21, 31…        1 банка
 *   few    2-4, 22-24…       2 банки
 *   many   5-20, 25-30…, 0   5 банок
 *   other  fracciones        1,5 банки   (genitivo singular)
 *
 * `tPackageLabel` elige con Intl.PluralRules. Las que ya son abreviatura
 * ("ст. л.", "ч. л.") o no se declinan ("авокадо", "ківі") repiten la
 * misma forma cuatro veces, a propósito: el test pide las cuatro.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Las cuatro formas de una palabra, más una cola opcional que no cambia. */
function _ukFormas(one, few, many, other, cola) {
  var c = cola ? " " + cola : "";
  return { one: one + c, few: few + c, many: many + c, other: other + c };
}

registerPackageTable("uk", {
  // ── Piezas que se compran de una en una ──────────────────────────────
  "aguacate":   _ukFormas("авокадо", "авокадо", "авокадо", "авокадо"),
  "batata":     _ukFormas("батат", "батати", "бататів", "батата"),
  "brócoli":    _ukFormas("головка", "головки", "головок", "головки", "броколі"),
  "calabacín":  _ukFormas("кабачок", "кабачки", "кабачків", "кабачка"),
  "coliflor":   _ukFormas("головка", "головки", "головок", "головки", "цвітної капусти"),
  "kiwi":       _ukFormas("ківі", "ківі", "ківі", "ківі"),
  "manzana":    _ukFormas("яблуко", "яблука", "яблук", "яблука"),
  "naranja":    _ukFormas("апельсин", "апельсини", "апельсинів", "апельсина"),
  "pepino":     _ukFormas("огірок", "огірки", "огірків", "огірка"),
  "pimiento":   _ukFormas("перець", "перці", "перців", "перця"),
  "piña":       _ukFormas("ананас", "ананаси", "ананасів", "ананаса"),
  "plátano":    _ukFormas("банан", "банани", "бананів", "банана"),
  "tomate":     _ukFormas("помідор", "помідори", "помідорів", "помідора"),

  // ── Envases ──────────────────────────────────────────────────────────
  "bandeja":    _ukFormas("лоток", "лотки", "лотків", "лотка"),
  "barra":      _ukFormas("батон", "батони", "батонів", "батона"),
  "bolsa":      _ukFormas("пакет", "пакети", "пакетів", "пакета"),
  "botella":    _ukFormas("пляшка", "пляшки", "пляшок", "пляшки"),
  // "Пакет молока" es lo que se dice también en ucraniano, aunque sea de cartón.
  "brick":      _ukFormas("пакет", "пакети", "пакетів", "пакета"),
  "caja":       _ukFormas("коробка", "коробки", "коробок", "коробки"),
  "hogaza":     _ukFormas("буханець", "буханці", "буханців", "буханця"),
  "malla":      _ukFormas("сітка", "сітки", "сіток", "сітки"),
  "paquete":    _ukFormas("упаковка", "упаковки", "упаковок", "упаковки"),
  "tarrina":    _ukFormas("баночка", "баночки", "баночок", "баночки"),
  "tarro":      _ukFormas("банка", "банки", "банок", "банки"),
  // Una docena: el envase se entiende sin pensar. SIN paréntesis a propósito:
  // la lista de la compra recorta la aclaración final, y "2 × упаковки" a
  // secas no dice de qué tamaño.
  "docena (12 huevos)":             _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 12 шт."),

  // ── Con aclaracion: el peso escurrido, los cortes, lo que rinde ──────
  "bola (peso escurrido)":          _ukFormas("кулька", "кульки", "кульок", "кульки", "(вага без рідини)"),
  "bolsa (cocida al vacío)":        _ukFormas("пакет", "пакети", "пакетів", "пакета", "(варене, вакуумне)"),
  "bote (peso escurrido)":          _ukFormas("банка", "банки", "банок", "банки", "(вага без рідини)"),
  "paquete (escurrido)":            _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "(без рідини)"),
  "pack de 2":                      _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 2 шт."),
  "pack de 2 (escurrido)":          _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 2 шт. (без рідини)"),
  "pack de 3 (escurrido)":          _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 3 шт. (без рідини)"),
  "pack de 6":                      _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 6 шт."),
  "pack de 6 (escurrido)":          _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 6 шт. (без рідини)"),
  "paquete de 12 lonchas":          _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 12 скибочок"),
  "bandeja (media de 2 cortes)":    _ukFormas("лоток", "лотки", "лотків", "лотка", "(у середньому 2 шматки)"),
  "bandeja (media de 3 cortes)":    _ukFormas("лоток", "лотки", "лотків", "лотка", "(у середньому 3 шматки)"),
  "bandeja (media de 4 cortes)":    _ukFormas("лоток", "лотки", "лотків", "лотка", "(у середньому 4 шматки)"),
  "bandeja (media de 5 cortes)":    _ukFormas("лоток", "лотки", "лотків", "лотка", "(у середньому 5 шматків)"),
  "bandeja (media de 6 cortes)":    _ukFormas("лоток", "лотки", "лотків", "лотка", "(у середньому 6 шматків)"),
  "paquete de 1 kg (rinde 2,3 kg cocido)":   _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 1 кг (≈2,3 кг у готовому вигляді)"),
  "paquete de 1 kg (rinde 2,8 kg cocido)":   _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 1 кг (≈2,8 кг у готовому вигляді)"),
  "paquete de 500 g (rinde 1,35 kg cocido)": _ukFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 500 г (≈1,35 кг у готовому вигляді)"),

  // ── Raciones de casa (js/data/servings.js) ───────────────────────────
  // La unidad en la que uno SIRVE, no en la que compra. Ver packages-en.js.
  "bola":       _ukFormas("кулька", "кульки", "кульок", "кульки"),
  "bote":       _ukFormas("банка", "банки", "банок", "банки"),
  "cebolla":    _ukFormas("цибулина", "цибулини", "цибулин", "цибулини"),
  // "білок" a secas es también "proteína", y esta línea va al lado de los
  // macros: "2 білки" se leería como gramos de proteína.
  "clara":      { one: "яєчний білок", few: "яєчні білки", many: "яєчних білків", other: "яєчного білка" },
  // Abreviaturas de receta: no cambian con el número.
  "cucharada":  _ukFormas("ст. л.", "ст. л.", "ст. л.", "ст. л."),
  "cucharadita": _ukFormas("ч. л.", "ч. л.", "ч. л.", "ч. л."),
  "huevo":      _ukFormas("яйце", "яйця", "яєць", "яйця"),
  "diente":     _ukFormas("зубчик", "зубчики", "зубчиків", "зубчика"),
  "lata":       _ukFormas("банка", "банки", "банок", "банки"),
  "loncha":     _ukFormas("скибочка", "скибочки", "скибочок", "скибочки"),
  "patata":     _ukFormas("картоплина", "картоплини", "картоплин", "картоплини"),
  "puñado":     _ukFormas("жменя", "жмені", "жмень", "жмені"),
  "rebanada":   _ukFormas("скибка", "скибки", "скибок", "скибки"),
  // Es la rodaja de piña: un кружечок.
  "rodaja":     _ukFormas("кружечок", "кружечки", "кружечків", "кружечка"),
  "salchicha":  _ukFormas("сосиска", "сосиски", "сосисок", "сосиски"),
  "tortilla":   _ukFormas("тортилья", "тортильї", "тортилій", "тортильї"),
  "tortita":    _ukFormas("хлібець", "хлібці", "хлібців", "хлібця"),
  "vaso":       _ukFormas("склянка", "склянки", "склянок", "склянки"),
  "yogur":      _ukFormas("йогурт", "йогурти", "йогуртів", "йогурта"),
  "zanahoria":  _ukFormas("морквина", "морквини", "морквин", "морквини"),

  // ── La unidad de consumo de «sin cocinar» (js/data/no-cook-classifier.js) ──
  // Ver packages-en.js.
  "porción":    _ukFormas("порція", "порції", "порцій", "порції"),
  "ración":     _ukFormas("порція", "порції", "порцій", "порції"),
  "taza":       _ukFormas("чашка", "чашки", "чашок", "чашки"),
  "trozo":      _ukFormas("шматок", "шматки", "шматків", "шматка"),
  "unidad":     _ukFormas("штука", "штуки", "штук", "штуки")
});
