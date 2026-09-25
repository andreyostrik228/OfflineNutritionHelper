/**
 * js/core/firebase-client.js
 * ─────────────────────────────────────────────────────────────────────────
 * Punto único de acceso a Firebase -- ningún otro módulo llama a
 * `firebase.initializeApp()` ni a `firebase.auth()` directamente.
 * Nunca lanza: getFirebaseAuth() devuelve `null` si el SDK no cargó (CDN
 * caído/bloqueado, ver <script> en index.html) o si
 * js/data/firebase-config.js todavía tiene valores de plantilla. El resto
 * de la app debe seguir funcionando en modo invitado cuando esto devuelve
 * null, nunca asumir que existe (mismo patrón que `typeof gsap`).
 *
 * ── Por qué solo el SDK de AUTENTICACIÓN ────────────────────────────────
 * El de Firestore pesa 548 KB; el de auth, con el núcleo, 173 KB (medido
 * 2026-09-25, v12.19.0). Para leer y escribir UN documento por usuario no
 * compensa medio mega en el móvil: los datos van por la API REST de
 * Firestore con el token del usuario (js/core/cloud-sync.js), y las reglas
 * de seguridad se aplican igual que con el SDK.
 *
 * Depende de:
 *   firebase (global del SDK compat, CDN -- ver index.html)
 *   js/data/firebase-config.js (FIREBASE_CONFIG)
 *
 * Expone (globales):
 *   isFirebaseConfigured()        → boolean, sin inicializar nada
 *   getFirebaseAuth()             → instancia de firebase.auth(), o null
 *   firestoreUserDocUrl(userId)   → URL REST del documento user_data/{uid}
 * ─────────────────────────────────────────────────────────────────────────
 */

var _firebaseAuthInstance = null;
var _firebaseAuthAttempted = false;

/**
 * @returns {boolean} - true solo si FIREBASE_CONFIG existe y ya no tiene
 *   los valores de plantilla.
 */
function isFirebaseConfigured() {
  if (typeof FIREBASE_CONFIG === "undefined" || !FIREBASE_CONFIG) return false;
  var claves = ["apiKey", "authDomain", "projectId", "appId"];
  for (var i = 0; i < claves.length; i++) {
    var valor = FIREBASE_CONFIG[claves[i]];
    if (typeof valor !== "string" || valor.length === 0 || valor.indexOf("YOUR_") !== -1) return false;
  }
  return true;
}

/**
 * Instancia de auth, creada como mucho una vez (memoizada, incluso si el
 * primer intento falló -- reintentar no arreglaría un SDK que no cargó ni
 * una config que sigue en plantilla).
 * @returns {object|null}
 */
function getFirebaseAuth() {
  if (_firebaseAuthAttempted) return _firebaseAuthInstance;
  _firebaseAuthAttempted = true;

  var sdkListo = (typeof firebase !== "undefined" && firebase &&
                  typeof firebase.initializeApp === "function" &&
                  typeof firebase.auth === "function");
  if (!sdkListo || !isFirebaseConfigured()) return null;

  try {
    var app = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
    _firebaseAuthInstance = app.auth();
  } catch (err) {
    console.error("[firebase-client] no se pudo inicializar Firebase:", err);
    _firebaseAuthInstance = null;
  }
  return _firebaseAuthInstance;
}

/**
 * URL REST del documento de un usuario. No comprueba nada de sesión: eso
 * es cosa de quien la usa (cloud-sync.js), que además manda el token.
 * @param {string} userId
 * @returns {string|null}
 */
function firestoreUserDocUrl(userId) {
  if (!isFirebaseConfigured() || typeof userId !== "string" || !userId) return null;
  return "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(FIREBASE_CONFIG.projectId) +
    "/databases/(default)/documents/user_data/" + encodeURIComponent(userId);
}
