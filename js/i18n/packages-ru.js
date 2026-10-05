/**
 * js/i18n/packages-ru.js
 * ─────────────────────────────────────────────────────────────────────────
 * Las etiquetas de ENVASE y de RACION, en ruso.
 *
 * Mismo contenido que packages-en.js (el test exige las MISMAS claves),
 * pero no en pares: el ruso cambia la palabra con el número, y en cuatro
 * formas, que son las categorías de plural de CLDR:
 *
 *   one    1, 21, 31…        1 банка
 *   few    2-4, 22-24…       2 банки
 *   many   5-20, 25-30…, 0   5 банок
 *   other  fracciones        1,5 банки   (genitivo singular)
 *
 * `tPackageLabel` elige con Intl.PluralRules. Las que ya son abreviatura
 * ("ст. л.", "ч. л.") o no se declinan ("авокадо", "киви") repiten la
 * misma forma cuatro veces, a propósito: el test pide las cuatro.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Las cuatro formas de una palabra, más una cola opcional que no cambia. */
function _ruFormas(one, few, many, other, cola) {
  var c = cola ? " " + cola : "";
  return { one: one + c, few: few + c, many: many + c, other: other + c };
}

registerPackageTable("ru", {
  // ── Piezas que se compran de una en una ──────────────────────────────
  "aguacate":   _ruFormas("авокадо", "авокадо", "авокадо", "авокадо"),
  "batata":     _ruFormas("батат", "батата", "бататов", "батата"),
  "brócoli":    _ruFormas("кочан", "кочана", "кочанов", "кочана", "брокколи"),
  "calabacín":  _ruFormas("кабачок", "кабачка", "кабачков", "кабачка"),
  "coliflor":   _ruFormas("кочан", "кочана", "кочанов", "кочана", "цветной капусты"),
  "kiwi":       _ruFormas("киви", "киви", "киви", "киви"),
  "manzana":    _ruFormas("яблоко", "яблока", "яблок", "яблока"),
  "naranja":    _ruFormas("апельсин", "апельсина", "апельсинов", "апельсина"),
  "pepino":     _ruFormas("огурец", "огурца", "огурцов", "огурца"),
  "pimiento":   _ruFormas("перец", "перца", "перцев", "перца"),
  "piña":       _ruFormas("ананас", "ананаса", "ананасов", "ананаса"),
  "plátano":    _ruFormas("банан", "банана", "бананов", "банана"),
  "tomate":     _ruFormas("помидор", "помидора", "помидоров", "помидора"),

  // ── Envases ──────────────────────────────────────────────────────────
  "bandeja":    _ruFormas("лоток", "лотка", "лотков", "лотка"),
  "barra":      _ruFormas("батон", "батона", "батонов", "батона"),
  "bolsa":      _ruFormas("пакет", "пакета", "пакетов", "пакета"),
  "botella":    _ruFormas("бутылка", "бутылки", "бутылок", "бутылки"),
  // "Пакет молока" es como se dice en ruso, aunque sea de cartón.
  "brick":      _ruFormas("пакет", "пакета", "пакетов", "пакета"),
  "caja":       _ruFormas("коробка", "коробки", "коробок", "коробки"),
  "hogaza":     _ruFormas("каравай", "каравая", "караваев", "каравая"),
  "malla":      _ruFormas("сетка", "сетки", "сеток", "сетки"),
  "paquete":    _ruFormas("упаковка", "упаковки", "упаковок", "упаковки"),
  "tarrina":    _ruFormas("баночка", "баночки", "баночек", "баночки"),
  "tarro":      _ruFormas("банка", "банки", "банок", "банки"),
  // Una docena: "дюжина" existe pero nadie compra huevos así; el envase
  // se entiende sin pensar. SIN paréntesis a propósito: la lista de la
  // compra recorta la aclaración final, y "2 × упаковки" a secas no dice
  // de qué tamaño.
  "docena (12 huevos)":             _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 12 шт."),

  // ── Con aclaracion: el peso escurrido, los cortes, lo que rinde ──────
  "bola (peso escurrido)":          _ruFormas("шарик", "шарика", "шариков", "шарика", "(вес без жидкости)"),
  "bolsa (cocida al vacío)":        _ruFormas("пакет", "пакета", "пакетов", "пакета", "(варёное, в вакууме)"),
  "bote (peso escurrido)":          _ruFormas("банка", "банки", "банок", "банки", "(вес без жидкости)"),
  "paquete (escurrido)":            _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "(без жидкости)"),
  "pack de 2":                      _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 2 шт."),
  "pack de 2 (escurrido)":          _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 2 шт. (без жидкости)"),
  "pack de 3 (escurrido)":          _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 3 шт. (без жидкости)"),
  "pack de 6":                      _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 6 шт."),
  "pack de 6 (escurrido)":          _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 6 шт. (без жидкости)"),
  "paquete de 12 lonchas":          _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 12 ломтиков"),
  "bandeja (media de 2 cortes)":    _ruFormas("лоток", "лотка", "лотков", "лотка", "(в среднем 2 куска)"),
  "bandeja (media de 3 cortes)":    _ruFormas("лоток", "лотка", "лотков", "лотка", "(в среднем 3 куска)"),
  "bandeja (media de 4 cortes)":    _ruFormas("лоток", "лотка", "лотков", "лотка", "(в среднем 4 куска)"),
  "bandeja (media de 5 cortes)":    _ruFormas("лоток", "лотка", "лотков", "лотка", "(в среднем 5 кусков)"),
  "bandeja (media de 6 cortes)":    _ruFormas("лоток", "лотка", "лотков", "лотка", "(в среднем 6 кусков)"),
  "paquete de 1 kg (rinde 2,3 kg cocido)":   _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 1 кг (≈2,3 кг в готовом виде)"),
  "paquete de 1 kg (rinde 2,8 kg cocido)":   _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 1 кг (≈2,8 кг в готовом виде)"),
  "paquete de 500 g (rinde 1,35 kg cocido)": _ruFormas("упаковка", "упаковки", "упаковок", "упаковки", "по 500 г (≈1,35 кг в готовом виде)"),

  // ── Raciones de casa (js/data/servings.js) ───────────────────────────
  // La unidad en la que uno SIRVE, no en la que compra. Ver packages-en.js.
  "bola":       _ruFormas("шарик", "шарика", "шариков", "шарика"),
  "bote":       _ruFormas("банка", "банки", "банок", "банки"),
  "cebolla":    _ruFormas("луковица", "луковицы", "луковиц", "луковицы"),
  // "Белок" a secas es también "proteína", y esta línea va al lado de los
  // macros: "2 белка" se leería como gramos de proteína.
  "clara":      { one: "яичный белок", few: "яичных белка", many: "яичных белков", other: "яичного белка" },
  // Abreviaturas de receta: no cambian con el número.
  "cucharada":  _ruFormas("ст. л.", "ст. л.", "ст. л.", "ст. л."),
  "cucharadita": _ruFormas("ч. л.", "ч. л.", "ч. л.", "ч. л."),
  "huevo":      _ruFormas("яйцо", "яйца", "яиц", "яйца"),
  "diente":     _ruFormas("зубчик", "зубчика", "зубчиков", "зубчика"),
  "lata":       _ruFormas("банка", "банки", "банок", "банки"),
  "loncha":     _ruFormas("ломтик", "ломтика", "ломтиков", "ломтика"),
  "patata":     _ruFormas("картофелина", "картофелины", "картофелин", "картофелины"),
  "puñado":     _ruFormas("горсть", "горсти", "горстей", "горсти"),
  "rebanada":   _ruFormas("ломтик", "ломтика", "ломтиков", "ломтика"),
  // Es la rodaja de piña: un aro.
  "rodaja":     _ruFormas("кружок", "кружка", "кружков", "кружка"),
  "salchicha":  _ruFormas("сосиска", "сосиски", "сосисок", "сосиски"),
  "tortilla":   _ruFormas("лепёшка", "лепёшки", "лепёшек", "лепёшки"),
  "tortita":    _ruFormas("хлебец", "хлебца", "хлебцев", "хлебца"),
  "vaso":       _ruFormas("стакан", "стакана", "стаканов", "стакана"),
  "yogur":      _ruFormas("йогурт", "йогурта", "йогуртов", "йогурта"),
  "zanahoria":  _ruFormas("морковка", "морковки", "морковок", "морковки"),

  // ── La unidad de consumo de «sin cocinar» (js/data/no-cook-classifier.js) ──
  // Ver packages-en.js.
  "porción":    _ruFormas("порция", "порции", "порций", "порции"),
  "ración":     _ruFormas("порция", "порции", "порций", "порции"),
  "taza":       _ruFormas("чашка", "чашки", "чашек", "чашки"),
  "trozo":      _ruFormas("кусок", "куска", "кусков", "куска"),
  "unidad":     _ruFormas("штука", "штуки", "штук", "штуки")
});
