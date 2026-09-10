/**
 * js/core/utils.js
 * ─────────────────────────────────────────────────────────────────────────
 * Funciones utilitarias compartidas por todos los módulos.
 *
 * No depende de ningún otro archivo del proyecto.
 * Debe cargarse PRIMERO en index.html.
 *
 * Expone (globales):
 *   round0(n)       → entero más cercano
 *   round1(n)       → 1 decimal
 *   round2(n)       → 2 decimales
 *   escapeHtml(str) → string seguro para insertar en innerHTML
 *   goalText(goal)  → texto legible del objetivo
 *   tasteText(taste)→ texto legible de la preferencia de sabor
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Redondeo ──────────────────────────────────────────────────────────────

function round0(n) {
  return Math.round(n);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ── Seguridad HTML ────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

// ── Textos de interfaz ────────────────────────────────────────────────────

// Estas dos salen DENTRO de frases ya traducidas ("Objetivo: recomposición"),
// asi que devolverlas siempre en castellano dejaba media linea en cada
// idioma. `t()` no existe en los tests que cargan utils.js suelto, de ahi
// la guarda.
function _txt(clave, castellano) {
  return (typeof t === "function") ? t(clave) : castellano;
}

function goalText(goal) {
  if (goal === "bulk")   return _txt("ui.objetivo_volumen", "volumen");
  if (goal === "cut")    return _txt("ui.objetivo_definicion", "definición");
  return _txt("ui.objetivo_recomposicion", "recomposición");
}

function tasteText(taste) {
  if (taste === "sweet")  return _txt("ui.sabor_dulce", "dulce");
  if (taste === "savory") return _txt("ui.sabor_salado", "salado");
  return _txt("ui.sabor_mixto", "mixto");
}
