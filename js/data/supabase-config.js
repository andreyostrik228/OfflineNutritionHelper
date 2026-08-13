/**
 * js/data/supabase-config.js
 * ─────────────────────────────────────────────────────────────────────────
 * Configuración pública del proyecto Supabase. SUPABASE_ANON_KEY es la
 * clave "anon/publishable" -- diseñada por Supabase para vivir en el
 * cliente (nunca la "service_role", que sí es secreta y nunca debe
 * aparecer en este repositorio). La seguridad real no depende de ocultar
 * esta clave: la da Row Level Security en Postgres (cada política exige
 * `auth.uid() = user_id`, ver supabase/schema.sql) -- exactamente el
 * modelo que Supabase documenta para apps 100% cliente como esta.
 *
 * Valores de plantilla hasta que el proyecto Supabase real exista
 * (dashboard → Project Settings → API). Mientras sigan siendo estos
 * placeholders, getSupabaseClient() (js/core/supabase-client.js) devuelve
 * `null` de forma segura y toda la app sigue funcionando en modo invitado
 * (localStorage), igual que hoy -- ver STATE.md para el checklist de
 * aprovisionamiento.
 *
 * Expone (globales):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 * ─────────────────────────────────────────────────────────────────────────
 */

var SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
var SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
