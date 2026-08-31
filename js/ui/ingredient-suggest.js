/**
 * js/ui/ingredient-suggest.js
 * ─────────────────────────────────────────────────────────────────────────
 * Autocompletado para el campo "Alimentos que no te gustan" (#dislikes):
 * el usuario escribe "lente" y la lista le ofrece "Lentejas cocidas".
 *
 * ── Por qué NO se reutiliza el <datalist> de #pantryAddName ──────────────
 * Era el primer candidato (mismo problema, ya resuelto una vez en
 * render-pantry.js) y no encaja, por DOS motivos independientes:
 *
 *   1. ACENTOS. El <datalist> nativo compara subcadenas literales, así que
 *      "platano" NO ofrece "Plátano". No es un caso raro: 13 de los 81
 *      ingredientes llevan tilde o eñe, y son justamente los que alguien
 *      querría descartar -- Plátano, Brócoli, Piña, Salmón, Jamón serrano,
 *      Champiñones, Calabacín, Atún al natural... Además el filtro de
 *      dislikes YA es insensible a acentos (matchesDislike() normaliza),
 *      así que un datalist dejaría el producto incoherente: el filtro
 *      entiende "platano" pero las sugerencias fingen que no existe.
 *
 *   2. LISTA SEPARADA POR COMAS. #pantryAddName contiene UN valor;
 *      #dislikes contiene "cebolla, queso azul, salmón". El <datalist>
 *      nativo compara sus opciones contra el valor COMPLETO del input, no
 *      contra lo que se está escribiendo ahora, así que en cuanto hay una
 *      coma deja de ofrecer nada útil. Aquí se sugiere sobre el ÚLTIMO
 *      término (lo que va después de la última coma) y al aceptar se
 *      sustituye solo ese término: lo ya escrito no se toca.
 *
 * ── De dónde salen las sugerencias ──────────────────────────────────────
 * De los ingredientes de DISH_DB (81 roles), igual que la despensa. Son
 * datos curados y se mantienen solos si cambia el catálogo. Con búsqueda
 * por subcadena cubren de sobra lo que alguien escribiría: queso, leche,
 * pollo, cerdo, atún, yogur, huevo, pan, arroz, lentejas, plátano,
 * brócoli... todos aciertan.
 *
 * Hueco conocido y medido: los dislikes también filtran PRODUCTOS (2.769
 * de Mercadona), y hay palabras que solo viven ahí -- chocolate, café,
 * limón, cacao, vino, cerveza. No se sugieren. No se ha añadido una lista
 * de palabras a mano porque habría que mantenerla y no sale de ningún
 * dato; escribirlas a pelo sigue funcionando, porque el filtro no depende
 * de esta lista para nada.
 *
 * Depende de:
 *   js/core/utils.js       (escapeHtml)
 *   js/core/preferences.js (normalizePreferenceText)
 *   js/data/dishes.js      (DISH_DB)
 *
 * Expone (global):
 *   initDislikesSuggest(inputEl)
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Cuántas sugerencias se muestran como mucho. */
var DISLIKES_SUGGEST_LIMIT = 8;

var _dislikeSuggestNames = null;

/**
 * Nombres de ingrediente únicos de DISH_DB, ordenados en español.
 * Se memoiza: DISH_DB no cambia en runtime.
 * @returns {string[]}
 */
function getDislikeSuggestNames() {
  if (_dislikeSuggestNames) return _dislikeSuggestNames;

  var seen = {};
  var names = [];

  if (typeof DISH_DB !== "undefined") {
    DISH_DB.forEach(function (dish) {
      (dish.items || []).forEach(function (item) {
        var key = normalizePreferenceText(item.name);
        if (!key || seen[key]) return;
        seen[key] = true;
        names.push(item.name);
      });
    });
  }

  names.sort(function (a, b) { return a.localeCompare(b, "es"); });
  _dislikeSuggestNames = names;
  return names;
}

/**
 * Trocea el valor del input en "lo ya confirmado" y "lo que se escribe".
 * "cebolla, sal" -> { prefix: "cebolla, ", term: "sal" }
 * @param {string} value
 * @returns {{prefix:string, term:string}}
 */
function splitDislikesInput(value) {
  var text = String(value || "");
  var cut = text.lastIndexOf(",");
  if (cut === -1) return { prefix: "", term: text.trim() };
  return { prefix: text.slice(0, cut + 1) + " ", term: text.slice(cut + 1).trim() };
}

/**
 * Ingredientes que casan con lo que se está escribiendo.
 *
 * Usa normalizePreferenceText() -- la MISMA normalización que
 * matchesDislike() -- para que sugerencias y filtro no puedan divergir:
 * si el filtro entiende "platano", la sugerencia también.
 *
 * Los que EMPIEZAN por el término van primero ("lente" -> "Lentejas"
 * antes que "Crema de lentejas"), que es lo que uno espera al teclear.
 *
 * @param {string} term
 * @param {string[]} [already] - términos ya escritos, para no repetirlos
 * @returns {string[]}
 */
function matchDislikeSuggestions(term, already) {
  var needle = normalizePreferenceText(term);
  if (!needle) return [];

  var taken = {};
  (already || []).forEach(function (t) {
    var k = normalizePreferenceText(t);
    if (k) taken[k] = true;
  });

  var starts = [];
  var contains = [];

  getDislikeSuggestNames().forEach(function (name) {
    var hay = normalizePreferenceText(name);
    if (taken[hay]) return;

    var at = hay.indexOf(needle);
    if (at === 0) starts.push(name);
    else if (at > 0) contains.push(name);
  });

  return starts.concat(contains).slice(0, DISLIKES_SUGGEST_LIMIT);
}

/**
 * Engancha el autocompletado a un input de dislikes.
 *
 * No cambia el formato del campo: sigue siendo texto separado por comas, y
 * el saneado real (recorte, deduplicado, topes) lo sigue haciendo
 * sanitizeStringList() en settings.js. Esto solo escribe texto en el input
 * como lo haría el usuario.
 *
 * @param {HTMLInputElement} inputEl
 */
function initDislikesSuggest(inputEl) {
  if (!inputEl || inputEl.dataset.suggestReady === "1") return;
  inputEl.dataset.suggestReady = "1";

  var box = document.createElement("ul");
  box.className = "suggest-list";
  box.id = "dislikesSuggestList";
  box.setAttribute("role", "listbox");
  box.hidden = true;

  // El ancla es un envoltorio que rodea SOLO al input, no el `.field`
  // entero. Anclando al `.field` la lista aparecía 139 px más abajo,
  // flotando por debajo del texto de ayuda, porque `top: 100%` se mide
  // contra la caja completa (input + <p class="field-hint">). Se vio en el
  // navegador, no en los tests: es geometría, no lógica.
  var anchor = document.createElement("div");
  anchor.className = "suggest-anchor";
  inputEl.parentNode.insertBefore(anchor, inputEl);
  anchor.appendChild(inputEl);
  anchor.appendChild(box);

  inputEl.setAttribute("role", "combobox");
  inputEl.setAttribute("aria-autocomplete", "list");
  inputEl.setAttribute("aria-expanded", "false");
  inputEl.setAttribute("aria-controls", box.id);

  var items = [];
  var active = -1;

  function close() {
    box.hidden = true;
    box.innerHTML = "";
    items = [];
    active = -1;
    inputEl.setAttribute("aria-expanded", "false");
    inputEl.removeAttribute("aria-activedescendant");
  }

  function paint() {
    box.innerHTML = items.map(function (name, i) {
      return '<li class="suggest-list__item' + (i === active ? " is-active" : "") + '"' +
        ' role="option" id="dislikesSuggest-' + i + '"' +
        ' aria-selected="' + (i === active ? "true" : "false") + '"' +
        ' data-index="' + i + '">' + escapeHtml(name) + "</li>";
    }).join("");

    box.hidden = !items.length;
    inputEl.setAttribute("aria-expanded", items.length ? "true" : "false");

    if (active >= 0) inputEl.setAttribute("aria-activedescendant", "dislikesSuggest-" + active);
    else inputEl.removeAttribute("aria-activedescendant");
  }

  function refresh() {
    var parts = splitDislikesInput(inputEl.value);
    var already = parts.prefix.split(",").map(function (p) { return p.trim(); }).filter(Boolean);
    items = matchDislikeSuggestions(parts.term, already);
    active = -1;
    paint();
  }

  /** Sustituye SOLO el término en curso; lo anterior se conserva tal cual. */
  function accept(name) {
    var parts = splitDislikesInput(inputEl.value);
    inputEl.value = parts.prefix + name + ", ";
    close();
    inputEl.focus();
  }

  inputEl.addEventListener("input", refresh);

  inputEl.addEventListener("keydown", function (e) {
    if (box.hidden || !items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = (active + 1) % items.length;
      paint();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = active <= 0 ? items.length - 1 : active - 1;
      paint();
    } else if (e.key === "Enter") {
      // Solo se roba el Enter si hay una sugerencia señalada; si no, el
      // formulario se envía como siempre.
      if (active >= 0) {
        e.preventDefault();
        accept(items[active]);
      }
    } else if (e.key === "Escape") {
      close();
    }
  });

  // mousedown, no click: el click llega DESPUÉS del blur, y para entonces
  // la lista ya estaría cerrada y el elemento no existiría.
  box.addEventListener("mousedown", function (e) {
    var li = e.target.closest(".suggest-list__item");
    if (!li) return;
    e.preventDefault();
    accept(items[Number(li.dataset.index)]);
  });

  inputEl.addEventListener("blur", function () {
    // Pequeño margen para que un mousedown en curso llegue a procesarse.
    setTimeout(close, 120);
  });
}
