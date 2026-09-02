-- supabase/delete-account.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Añade "borrar mi cuenta" al proyecto. Pegar entero en el SQL Editor del
-- proyecto Supabase (dashboard → SQL Editor → New query → Run) UNA sola
-- vez, igual que schema.sql. Es incremental: no toca nada de lo que ya
-- existe y se puede ejecutar sobre un proyecto en marcha.
--
-- ── Por qué hace falta este archivo ─────────────────────────────────────
-- schema.sql decía, literalmente, "Sin política DELETE: no hay función de
-- borrar cuenta en la app". Al escribir las condiciones de uso hubo que
-- decidir cómo pide alguien que borren sus datos, y la respuesta elegida
-- fue un botón dentro de la aplicación en vez de una dirección de correo.
-- Un botón así necesita poder borrar DOS cosas, y solo una de ellas está
-- al alcance del cliente:
--
--   public.user_data  → la fila del usuario. Con una política DELETE, el
--                       propio cliente puede borrarla.
--   auth.users        → la cuenta en sí. El esquema `auth` NO es
--                       accesible desde el cliente por diseño, y la API
--                       de administración exige la service_role key, que
--                       jamás puede estar en un frontend público.
--
-- La salida es una función `security definer`: se ejecuta con los
-- permisos de quien la creó, pero borra ÚNICA Y EXCLUSIVAMENTE la fila
-- cuyo id coincide con `auth.uid()`, es decir, la del propio usuario que
-- llama. No recibe ningún parámetro a propósito -- si aceptara un id,
-- sería una función para borrar la cuenta de cualquiera.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Que el usuario pueda borrar su propia fila de datos. Misma forma que
--    las otras tres políticas: la condición es siempre auth.uid() = user_id.
drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own" on public.user_data
  for delete using (auth.uid() = user_id);

grant delete on public.user_data to authenticated;

-- 2. Borrar la cuenta entera.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  -- Sin sesión no hay cuenta que borrar. Se lanza en vez de devolver en
  -- silencio para que el cliente no pueda enseñar "cuenta borrada" cuando
  -- no se ha borrado nada.
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  -- La fila de datos se borraría igualmente por el `on delete cascade` de
  -- user_data.user_id, pero se hace explícito: si algún día alguien
  -- cambia esa referencia, los datos del usuario seguirán desapareciendo.
  delete from public.user_data where user_id = uid;

  -- Y la cuenta. `uid` viene de auth.uid(), nunca de un parámetro: esta
  -- función no puede borrar a nadie más que a quien la llama.
  delete from auth.users where id = uid;
end;
$$;

-- Solo un usuario con sesión iniciada puede llamarla; `anon` no.
revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
