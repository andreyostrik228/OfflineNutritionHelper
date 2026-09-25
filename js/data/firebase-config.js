/**
 * js/data/firebase-config.js
 * ─────────────────────────────────────────────────────────────────────────
 * Configuración pública del proyecto Firebase `weekplate-146b0`
 * (aprovisionado 2026-09-25, sustituye a Supabase -- ver STATE.md y
 * HANDOFF.md 9).
 *
 * `apiKey` NO es un secreto: Firebase la diseña para vivir en el cliente
 * (identifica el proyecto, no autoriza nada). La seguridad real la dan las
 * reglas de Firestore -- firebase/firestore.rules, "cada usuario solo su
 * propio documento" -- exactamente como antes la daba Row Level Security.
 *
 * Si algún día hace falta volver a modo plantilla, basta con restaurar
 * valores que contengan "YOUR_": isFirebaseConfigured() da false, el
 * cliente cae a null y toda la app sigue funcionando en modo invitado
 * (localStorage).
 *
 * Expone (globales):
 *   FIREBASE_CONFIG
 * ─────────────────────────────────────────────────────────────────────────
 */

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyC6awYeikkwGa_nV02YR5jhD8zvs8Aj9ec",
  authDomain: "weekplate-146b0.firebaseapp.com",
  projectId: "weekplate-146b0",
  appId: "1:664245269882:web:d5edc41eb25e40dfe852c3"
};
