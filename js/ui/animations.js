/**
 * js/ui/animations.js
 * ─────────────────────────────────────────────────────────────────────────
 * Animaciones GSAP para el resultado del plan generado.
 *
 * Se mantiene separado de render.js a propósito: render.js sigue siendo
 * responsable únicamente de construir/insertar el HTML; este archivo solo
 * anima elementos que YA existen en el DOM después de ese render. Si GSAP
 * no está disponible (CDN caído, bloqueado, etc.) todas las funciones se
 * degradan a no-op silencioso y la app sigue funcionando exactamente igual
 * que antes de añadir GSAP — ningún dato ni funcionalidad depende de esto.
 *
 * Respeta prefers-reduced-motion vía gsap.matchMedia(), tal como indica
 * la guía oficial de gsap-core.
 *
 * Depende de: GSAP (CDN, cargado antes que este archivo en index.html)
 * Es llamado por: js/app.js, tras renderMeals() y renderSummary()
 *
 * Expone (globales):
 *   animateMealCardsIn()              – stagger de entrada para .meal-card
 *   animateSummaryNumbers(profile, total) – count-up de las 4 cifras grandes
 *   animateShoppingListIn()           – stagger de entrada para .shopping-item
 * ─────────────────────────────────────────────────────────────────────────
 */

var _gsapReady = (typeof gsap !== "undefined");

// Un solo matchMedia reutilizado para no crear contextos nuevos en cada plan.
var _mm = _gsapReady ? gsap.matchMedia() : null;

/**
 * Anima la entrada de las tarjetas de comida recién insertadas en el DOM
 * (llamar justo después de renderMeals()). Cada tarjeta aparece con un
 * ligero desplazamiento vertical y fade, en cascada.
 *
 * No-op si GSAP no cargó — el layout final es idéntico sin animación,
 * ya que gsap.from() sin ejecutarse simplemente deja el CSS estático.
 */
function animateMealCardsIn() {
  if (!_gsapReady || !mealsContainer) return;

  var cards = mealsContainer.querySelectorAll(".meal-card");
  if (!cards.length) return;

  _mm.add(
    {
      motionOK: "(prefers-reduced-motion: no-preference)"
    },
    function (context) {
      if (!context.conditions.motionOK) return; // reduced motion → sin animación, CSS estático se queda

      var tl = gsap.timeline();

      tl.from(cards, {
        autoAlpha: 0,
        y: 16,
        scale: 0.98,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.08,
        clearProps: "opacity,visibility,transform"
      });

      // Los ingredientes de cada tarjeta entran justo después, en cascada
      // más rápida — arranca un poco antes de que acabe el stagger de
      // arriba para que se sienta una sola cascada continua, no dos.
      var rows = mealsContainer.querySelectorAll(".food-row");
      if (rows.length) {
        tl.from(
          rows,
          {
            autoAlpha: 0,
            y: 8,
            duration: 0.35,
            ease: "power1.out",
            stagger: 0.035,
            clearProps: "opacity,visibility,transform"
          },
          "-=0.25"
        );
      }
    }
  );
}

/**
 * Anima la entrada de las filas de la lista de la compra recién insertadas
 * (llamar justo después de renderShoppingList()). Mismo criterio que
 * animateMealCardsIn(): no-op si GSAP no cargó o si el usuario pide
 * prefers-reduced-motion.
 */
function animateShoppingListIn() {
  if (!_gsapReady || typeof shoppingListContainer === "undefined" || !shoppingListContainer) return;

  var rows = shoppingListContainer.querySelectorAll(".shopping-item");
  if (!rows.length) return;

  _mm.add(
    { motionOK: "(prefers-reduced-motion: no-preference)" },
    function (context) {
      if (!context.conditions.motionOK) return;

      gsap.from(rows, {
        autoAlpha: 0,
        y: 10,
        duration: 0.35,
        ease: "power1.out",
        stagger: 0.03,
        clearProps: "opacity,visibility,transform"
      });
    }
  );
}

/**
 * Anima el conteo ascendente de las 4 cifras grandes del resumen
 * (calorías/proteína/carbos/grasas) desde 0 hasta su valor final.
 * Llamar justo después de renderSummary(profile, total), con los
 * mismos dos argumentos.
 *
 * Usa un objeto proxy {val:0} tween-eado por GSAP y actualiza el
 * textContent en onUpdate — técnica estándar de GSAP para animar
 * números que no son directamente propiedades CSS.
 *
 * @param {object} profile  – salida de calculateProfile() (mismo arg que renderSummary)
 * @param {object} total    – salida de sumMeals() (mismo arg que renderSummary)
 */
function animateSummaryNumbers(profile, total) {
  if (!_gsapReady || !summaryEls) return;

  _mm.add(
    {
      motionOK: "(prefers-reduced-motion: no-preference)"
    },
    function (context) {
      if (!context.conditions.motionOK) return; // reduced motion → el valor final ya lo puso renderSummary()

      _countUp(summaryEls.calories, round0(profile.calories), " kcal");
      _countUp(summaryEls.protein,  round0(profile.protein),  " g");
      _countUp(summaryEls.carbs,    round0(profile.carbs),    " g");
      _countUp(summaryEls.fats,     round0(profile.fats),     " g");
    }
  );
}

/**
 * Tween interno: cuenta desde 0 hasta targetValue y escribe el entero
 * redondeado en el textContent del elemento en cada frame.
 *
 * @param {HTMLElement} el
 * @param {number} targetValue
 * @param {string} suffix  – ej. " kcal", " g"
 */
function _countUp(el, targetValue, suffix) {
  if (!el) return;
  var proxy = { val: 0 };
  gsap.to(proxy, {
    val: targetValue,
    duration: 0.6,
    ease: "power2.out",
    onUpdate: function () {
      el.textContent = round0(proxy.val) + suffix;
    },
    onComplete: function () {
      el.textContent = targetValue + suffix; // asegura el valor exacto final, sin redondeos de frame
      _pulseCard(el);
    }
  });
}

/**
 * Añade brevemente la clase .pulse a la summary-card contenedora de `el`
 * (ver @keyframes cardLanding en style.css) y la retira al terminar, para
 * poder relanzarla en el siguiente plan generado.
 * @param {HTMLElement} el
 */
function _pulseCard(el) {
  var card = el.closest && el.closest(".summary-card");
  if (!card) return;
  card.classList.remove("pulse");
  void card.offsetWidth; // fuerza reflow para poder reiniciar la animación
  card.classList.add("pulse");
  card.addEventListener("animationend", function handler() {
    card.classList.remove("pulse");
    card.removeEventListener("animationend", handler);
  });
}