/**
 * js/core/supabase-client.js
 * ─────────────────────────────────────────────────────────────────────────
 * Punto único de acceso al cliente de Supabase -- ningún otro módulo
 * llama a `supabase.createClient()` directamente. getSupabaseClient()
 * nunca lanza: devuelve `null` si el SDK no cargó (CDN caído/bloqueado,
 * ver <script> en index.html) o si js/data/supabase-config.js todavía
 * tiene los valores de plantilla (proyecto sin aprovisionar). Mismo
 * patrón de "dependencia opcional" que `typeof gsap !== "undefined"`
 * (js/ui/animations.js) o `typeof localStorage !== "undefined"`
 * (pantry.js) -- el resto de la app debe seguir funcionando en modo
 * invitado cuando esto devuelve null, nunca asumir que existe.
 *
 * Depende de:
 *   supabase (global del SDK, CDN UMD -- ver index.html)
 *   js/data/supabase-config.js (SUPABASE_URL, SUPABASE_ANON_KEY)
 *
 * Expone (globales):
 *   isSupabaseConfigured() → boolean, sin crear el cliente
 *   getSupabaseClient()    → cliente real, o null si no disponible
 * ─────────────────────────────────────────────────────────────────────────
 */

var _supabaseSdkReady = (typeof supabase !== "undefined" && typeof supabase.createClient === "function");
var _supabaseClientInstance = null;
var _supabaseClientAttempted = false;

/**
 * @returns {boolean} - true solo si SUPABASE_URL/SUPABASE_ANON_KEY ya no
 *   son los placeholders de plantilla.
 */
function isSupabaseConfigured() {
  return typeof SUPABASE_URL === "string" && typeof SUPABASE_ANON_KEY === "string"
    && SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
    && SUPABASE_URL.indexOf("YOUR_SUPABASE_PROJECT_URL") === -1
    && SUPABASE_ANON_KEY.indexOf("YOUR_SUPABASE_ANON_KEY") === -1;
}

/**
 * Cliente Supabase, creado como mucho una vez (memoizado, incluso si el
 * primer intento falló -- reintentar en cada llamada no arreglaría un SDK
 * que no cargó ni una config que sigue en placeholder).
 * @returns {object|null}
 */
function getSupabaseClient() {
  if (_supabaseClientAttempted) return _supabaseClientInstance;
  _supabaseClientAttempted = true;

  if (!_supabaseSdkReady || !isSupabaseConfigured()) return null;

  try {
    _supabaseClientInstance = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error("[supabase-client] no se pudo crear el cliente:", err);
    _supabaseClientInstance = null;
  }
  return _supabaseClientInstance;
}
