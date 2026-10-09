-- BuscaPelis: tabla, permisos y funciones para Supabase.
-- Se ejecuta una vez, entero, en el «SQL Editor» del proyecto de Supabase. Se puede volver a ejecutar sin perder datos.
--
-- Cada persona tiene una fila con sus listas y preferencias en un JSON con las mismas claves que el documento de Firestore
-- de la versión de Gemini Canvas (watched_movie, pending_tv, watchedSeasons_tv, selected_providers, filter_by_streaming…),
-- más su clave de Gemini (gemini_key). Nadie más puede leer ni cambiar esa fila.

create table if not exists public.preferencias (
    usuario     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
    datos       jsonb not null default '{}'::jsonb,
    actualizado timestamptz not null default now()
);

alter table public.preferencias enable row level security;

drop policy if exists "ver mis preferencias" on public.preferencias;
create policy "ver mis preferencias" on public.preferencias
    for select to authenticated using (usuario = auth.uid());

drop policy if exists "crear mis preferencias" on public.preferencias;
create policy "crear mis preferencias" on public.preferencias
    for insert to authenticated with check (usuario = auth.uid());

drop policy if exists "cambiar mis preferencias" on public.preferencias;
create policy "cambiar mis preferencias" on public.preferencias
    for update to authenticated using (usuario = auth.uid()) with check (usuario = auth.uid());

drop policy if exists "borrar mis preferencias" on public.preferencias;
create policy "borrar mis preferencias" on public.preferencias
    for delete to authenticated using (usuario = auth.uid());

-- Guarda solo las claves que llegan y deja el resto como estaba (como «setDoc(…, { merge: true })» en Firestore).
-- Se hace en una sola sentencia para que dos cambios seguidos no se pisen.
create or replace function public.fusionar_preferencias(p_datos jsonb)
returns void language sql security invoker set search_path = public as $$
    insert into public.preferencias (usuario, datos)
    values (auth.uid(), p_datos)
    on conflict (usuario) do update
        set datos = public.preferencias.datos || excluded.datos,
            actualizado = now()
$$;

revoke all on function public.fusionar_preferencias(jsonb) from public, anon;
grant execute on function public.fusionar_preferencias(jsonb) to authenticated;
grant select, insert, update, delete on public.preferencias to authenticated;

-- Cambios en vivo: si cambias algo en el móvil, el ordenador lo ve al momento.
do $$
begin
    alter publication supabase_realtime add table public.preferencias;
exception when duplicate_object then null;
end $$;
