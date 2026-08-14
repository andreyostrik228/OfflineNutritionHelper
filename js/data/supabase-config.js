/**
 * js/data/supabase-config.js
 * ─────────────────────────────────────────────────────────────────────────
 * Configuración pública del proyecto Supabase real (aprovisionado
 * 2026-08-14, ver STATE.md). SUPABASE_ANON_KEY es la clave "publishable"
 * -- diseñada por Supabase para vivir en el cliente (nunca la
 * "secret"/"service_role", que sí es secreta y nunca debe aparecer en
 * este repositorio). La seguridad real no depende de ocultar esta clave:
 * la da Row Level Security en Postgres (cada política exige `auth.uid()
 * = user_id`, ver supabase/schema.sql) -- exactamente el modelo que
 * Supabase documenta para apps 100% cliente como esta. Verificado en
 * vivo antes de fijar este valor: `GET /rest/v1/user_data` con esta
 * clave y sin sesión devuelve `[]` (RLS bloqueando correctamente, no un
 * error de "tabla no existe" ni datos filtrados).
 *
 * Si algún día hace falta volver a modo plantilla (proyecto distinto,
 * rotación de clave...), basta con restaurar valores no válidos aquí --
 * getSupabaseClient() (js/core/supabase-client.js) cae a `null` de forma
 * segura y toda la app sigue funcionando en modo invitado (localStorage).
 *
 * Expone (globales):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 * ─────────────────────────────────────────────────────────────────────────
 */

var SUPABASE_URL = "https://tizrdycctkiwdcmlyqku.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_4ZpmDIUlaFkTcOeCQ0dQ4g_20SzaFzY";
