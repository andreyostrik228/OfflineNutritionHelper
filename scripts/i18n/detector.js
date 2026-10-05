"use strict";
/**
 * scripts/i18n/detector.js
 * ──────────────────────────────────────────────────────────────────────
 * ¿Es esto español (o una unidad sin traducir) dentro de una pantalla que no
 * debería tenerlo? Lo usan dos cosas, para que no haya dos criterios:
 *
 *   - scripts/i18n/escanear-pantallas.js, que lo aplica al texto de la
 *     aplicación abierta en un navegador;
 *   - tests/i18n-render.test.js, que lo aplica al HTML que devuelven los
 *     renderers cargados en un sandbox, sin navegador.
 *
 * Es una heurística y lo sabe: busca señales de español (¿ ¡ ñ, vocales con
 * tilde, palabras que en inglés no existen) y, en ruso, letras latinas. Un
 * nombre de producto de Mercadona las dispara -- "Yogur griego natural
 * Hacendado" es español a propósito --, así que quien llama tiene que
 * quitarlos antes (ver quitarProductos).
 *
 * Sin dependencias: solo Node.
 * ──────────────────────────────────────────────────────────────────────
 */

/** Latino permitido en un idioma no latino: marcas y nombres propios. */
var LATINO_PERMITIDO = /^(weekplate|mercadona|google|hacendado|firebase|e-?mail|ok|eur|www|pwa|offline|ean|pdf|x)$/i;

/** El nombre de cada idioma, en su idioma: no se traduce nunca. */
var NOMBRES_DE_IDIOMA = /^(español|english|deutsch|français|русский|українська|italiano|português|polski|română)$/i;

/**
 * Los EJEMPLOS que el usuario teclea (se buscan contra el catálogo español,
 * así que se quedan en español dentro de la traducción: ver i18n.test.js,
 * «los EJEMPLOS que el usuario teclea siguen en español»).
 */
var EJEMPLOS_EN_ESPANOL = ["cebolla, queso azul, salmón", "Arroz blanco cocido", "yogur, Hacendado, pollo"];

/** Palabras inglesas que llevan tilde y no son español. */
var INGLES_CON_TILDE = /\b(sautéed|café|jalapeño|crème|purée|fiancé|résumé|naïve|déjà)\b/gi;

/** Palabras que en inglés no existen y en español son de todos los días. */
var ES_PALABRAS = ["de", "la", "el", "los", "las", "con", "para", "que", "sin", "por", "una",
  "del", "tu", "tus", "más", "mas", "también", "está", "hay", "entre", "sobre", "hasta", "desde",
  "cada", "al", "su", "sus", "mis", "este", "esta", "estos", "estas", "otro", "otra", "muy", "pero",
  "cuando", "donde", "cuánto", "qué", "cómo", "año", "años", "día", "días", "dias", "tienes",
  "quieres", "puedes", "todo", "todos", "toda", "nada", "ya", "tiene", "necesita", "faltan",
  "falta", "plato", "platos", "despensa", "cambiar", "usado", "consumo", "paquete", "paquetes",
  "envase", "invitado", "caracteres", "ración", "raciones", "comer", "cocinar", "preparación",
  "presupuesto", "variedad", "proteína", "calorías", "desayuno", "tiempo", "minutos", "gramos",
  "borrando", "escribe", "número", "elige", "opción", "continuar", "poner", "hoy", "mañana",
  "añadir", "borrar", "guardar", "quitar", "fecha", "caduca", "caducidad", "nevera", "congelador",
  "tienda", "precio", "unidad", "unidades", "lata", "latas", "bote", "botes", "media", "medio",
  "nuevo", "nueva", "planes", "semana", "hecho", "cocinado", "comprado", "comprar", "pendiente",
  "ingredientes", "productos", "comidas", "tomas", "compraste", "compré", "registrar", "otra",
  "cuenta", "cuentas", "contraseña", "iniciar", "sesión", "correo", "email", "ver", "foto", "ficha"];

/**
 * Estas existen en inglés (o son, escritas así, otra palabra), y una sola no
 * basta: hacen falta dos juntas para sospechar de español.
 */
var ES_AMBIGUAS = ["lo", "se", "es", "te", "mi", "si", "ha", "han", "fue", "son", "pon", "hora",
  "cena", "comida", "ajustado", "objetivo", "ver", "foto", "email", "compra", "cuenta",
  "ficha", "media", "medio", "fecha", "no"];

/** Quita del texto los ejemplos que se teclean y se quedan en español. */
function sinEjemplos(texto) {
  return EJEMPLOS_EN_ESPANOL.reduce(function (t, e) { return t.split(e).join(" "); }, texto);
}

function palabras(texto) {
  return texto.toLowerCase().match(/[a-záéíóúüñ]+/g) || [];
}

/**
 * El motivo por el que `texto` parece español, o "" si no lo parece.
 * @param {string} texto
 * @param {string} lang - idioma de la pantalla ("ru", "en"...)
 * @returns {string}
 */
function motivoDeEspanol(texto, lang) {
  texto = sinEjemplos(texto);
  if (lang === "en") texto = texto.replace(INGLES_CON_TILDE, " ");
  if (/[¿¡ñÑ]/.test(texto)) return "signo o ñ española";
  if (/[áéíóúü]/i.test(texto) && lang !== "es") return "vocal acentuada";
  var ws = palabras(texto);
  var fuertes = ws.filter(function (w) {
    return ES_PALABRAS.indexOf(w) !== -1 && ES_AMBIGUAS.indexOf(w) === -1;
  });
  if (fuertes.length) return "palabra española: " + fuertes.slice(0, 3).join(", ");
  var ambiguas = ws.filter(function (w) { return ES_AMBIGUAS.indexOf(w) !== -1; });
  if (ambiguas.length >= 2) return "palabras españolas: " + ambiguas.slice(0, 3).join(", ");
  return "";
}

/**
 * Todo lo que está mal en `texto` para `lang`: español suelto, unidades
 * latinas pegadas a un número (ruso) o cirílico en inglés.
 * @param {string} texto
 * @param {string} lang
 * @returns {string[]} motivos; vacío si el texto está bien
 */
function analizarTexto(texto, lang) {
  var t = sinEjemplos(String(texto)).replace(/\s+/g, " ").trim();
  if (!t || NOMBRES_DE_IDIOMA.test(t)) return [];
  var problemas = [];
  var sp = motivoDeEspanol(t, lang);
  if (sp) problemas.push(sp);

  if (lang === "ru" || lang === "uk") {
    var u = t.match(/\d+(?:[.,]\d+)?\s*(kcal|kg|ml|min|g)\b/i);
    if (u) problemas.push("unidad sin traducir: «" + u[0] + "»");
    var latinas = (t.match(/[A-Za-z][A-Za-z'-]+/g) || []).filter(function (w) {
      return !LATINO_PERMITIDO.test(w);
    });
    if (latinas.length && !sp && !u) problemas.push("palabra latina: " + latinas.slice(0, 4).join(", "));
    else if (latinas.length && !u && sp) { /* ya marcado como español */ }
  } else if (lang === "en") {
    var un = t.match(/\d+(?:[.,]\d+)?\s*(ккал|кг|мл|мин|г)(?![а-яё])/i);
    if (un) problemas.push("unidad rusa: «" + un[0] + "»");
    if (/[А-Яа-яЁё]/.test(t)) problemas.push("cirílico en inglés");
  }
  return problemas;
}

/**
 * Convierte un trozo de HTML de los renderers en el texto que verá la
 * persona: sin etiquetas, con las entidades que usa la interfaz resueltas, y
 * SIN los nombres de producto (lo que pone en la estantería del súper no se
 * traduce nunca, y se marca con las clases de PRODUCTO_CLASES).
 * @param {string} html
 * @returns {string}
 */
var PRODUCTO_CLASES = ["food-purchase__product", "nocook-item__name", "nocook-item__brand",
  "verified-card__name", "verified-card__brand", "product-find-btn"];

function textoDeHtml(html) {
  var h = String(html);
  PRODUCTO_CLASES.forEach(function (c) {
    // El elemento entero, hasta su cierre. Los nombres de producto no llevan
    // etiquetas propias; el botón de la foto es un <a> cuyo aria-label los
    // nombra, y por eso también se salta.
    h = h.replace(new RegExp('<(span|div|a)[^>]*class="[^"]*\\b' + c + '\\b[^"]*"[^>]*>[\\s\\S]*?</\\1>', "g"), " ");
  });
  // Los atributos que se leen (title, aria-label) cuentan como texto.
  h = h.replace(/\s(?:title|aria-label|placeholder|alt)="([^"]*)"/g, function (m, v) { return " [" + v + "] "; });
  h = h.replace(/<[^>]*>/g, " ");
  var ENT = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", euro: "€", middot: "·", mdash: "—",
    times: "×", asymp: "≈", nbsp: " ", laquo: "«", raquo: "»", hellip: "…", iquest: "¿",
    aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", "#8635": "↻", "#10003": "✓" };
  h = h.replace(/&(#?\w+);/g, function (m, e) { return Object.prototype.hasOwnProperty.call(ENT, e) ? ENT[e] : m; });
  return h.replace(/\s+/g, " ").trim();
}

module.exports = {
  analizarTexto: analizarTexto,
  motivoDeEspanol: motivoDeEspanol,
  textoDeHtml: textoDeHtml,
  LATINO_PERMITIDO: LATINO_PERMITIDO,
  NOMBRES_DE_IDIOMA: NOMBRES_DE_IDIOMA,
  PRODUCTO_CLASES: PRODUCTO_CLASES
};
