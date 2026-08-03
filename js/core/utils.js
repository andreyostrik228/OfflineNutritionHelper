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

function goalText(goal) {
  if (goal === "bulk")   return "volumen";
  if (goal === "cut")    return "definición";
  return "recomposición";
}

function tasteText(taste) {
  if (taste === "sweet")  return "dulce";
  if (taste === "savory") return "salado";
  return "mixto";
}
