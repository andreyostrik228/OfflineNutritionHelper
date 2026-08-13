-- supabase/schema.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Esquema completo para las cuentas de Offline Nutrition Helper. Pegar
-- entero en el SQL Editor del proyecto Supabase (dashboard → SQL Editor →
-- New query → Run) UNA sola vez, después de crear el proyecto.
--
-- Una sola fila por usuario, con tres columnas JSONB que reflejan 1:1 las
-- tres claves de localStorage que ya existían/se añadieron en el cliente
-- (pantry.js, settings.js) -- ver STATE.md para el razonamiento completo.
-- La seguridad real la da Row Level Security (cada política exige
-- `auth.uid() = user_id`), NUNCA el hecho de que la anon key sea difícil
-- de adivinar -- esa key es pública por diseño (ver js/data/
-- supabase-config.js).
--
-- Un trigger aprovisiona la fila vacía en el instante del signup, así el
-- cliente nunca necesita comprobar "¿existe ya mi fila?" -- todas las
-- escrituras del cliente son UPDATE, nunca upsert/insert (ver
-- js/core/cloud-sync.js).
-- ─────────────────────────────────────────────────────────────────────────

create table public.user_data (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  pantry_state   jsonb not null default '{}'::jsonb,
  pantry_history jsonb not null default '[]'::jsonb,
  settings       jsonb not null default '{}'::jsonb,
  migrated_at    timestamptz,          -- solo auditoría, nunca la guarda de idempotencia (ver js/core/migration.js)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "user_data_select_own" on public.user_data
  for select using (auth.uid() = user_id);

create policy "user_data_insert_own" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "user_data_update_own" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sin política DELETE: no hay función de "borrar cuenta" en la app; si
-- algún día se borra un usuario desde el dashboard, `on delete cascade`
-- ya limpia su fila.

grant select, insert, update on public.user_data to authenticated;

-- Mantiene updated_at honesto en cada escritura del cliente.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_data_set_updated_at
  before update on public.user_data
  for each row execute function public.set_updated_at();

-- Aprovisiona la fila vacía en el instante del signup -- ver cabecera.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_data (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
