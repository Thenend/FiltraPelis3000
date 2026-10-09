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

-- Pone (p_poner) o quita una obra de una de las listas, sin tocar el resto: dos cambios a la vez desde dos dispositivos
-- no se pisan. «lista_con» devuelve la lista con o sin esa obra.
create or replace function public.lista_con(p_lista jsonb, p_id bigint, p_poner boolean)
returns jsonb language sql immutable set search_path = public as $$
    select case
        when p_poner and coalesce(p_lista, '[]'::jsonb) @> jsonb_build_array(p_id) then p_lista
        when p_poner then coalesce(p_lista, '[]'::jsonb) || jsonb_build_array(p_id)
        else (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) e where e <> to_jsonb(p_id))
    end
$$;

create or replace function public.poner_en_lista(p_clave text, p_id bigint, p_poner boolean, p_pestana text default null)
returns void language sql security invoker set search_path = public as $$
    insert into public.preferencias (usuario, datos)
    select auth.uid(), jsonb_build_object(p_clave, public.lista_con(null, p_id, p_poner), '_pestana', p_pestana)
    where p_clave in ('watched_movie', 'discarded_movie', 'favorites_movie', 'pending_movie',
                      'watched_tv', 'discarded_tv', 'favorites_tv', 'pending_tv')
    on conflict (usuario) do update
        set datos = public.preferencias.datos || jsonb_build_object(
                p_clave, public.lista_con(public.preferencias.datos -> p_clave, p_id, p_poner),
                '_pestana', p_pestana),
            actualizado = now()
$$;

-- Temporadas vistas y en curso de una serie, y si está vista entera (lista «watched_tv»), sin tocar las demás series.
create or replace function public.guardar_temporadas(p_serie bigint, p_vistas jsonb, p_viendo jsonb, p_entera boolean, p_pestana text default null)
returns void language sql security invoker set search_path = public as $$
    insert into public.preferencias (usuario, datos)
    values (auth.uid(), jsonb_build_object(
        'watchedSeasons_tv', jsonb_build_object(p_serie::text, p_vistas),
        'watchingSeasons_tv', jsonb_build_object(p_serie::text, p_viendo),
        'watched_tv', public.lista_con(null, p_serie, p_entera),
        '_pestana', p_pestana))
    on conflict (usuario) do update
        set datos = public.preferencias.datos || jsonb_build_object(
                'watchedSeasons_tv', coalesce(public.preferencias.datos -> 'watchedSeasons_tv', '{}'::jsonb) || jsonb_build_object(p_serie::text, p_vistas),
                'watchingSeasons_tv', coalesce(public.preferencias.datos -> 'watchingSeasons_tv', '{}'::jsonb) || jsonb_build_object(p_serie::text, p_viendo),
                'watched_tv', public.lista_con(public.preferencias.datos -> 'watched_tv', p_serie, p_entera),
                '_pestana', p_pestana),
            actualizado = now()
$$;

revoke all on function public.lista_con(jsonb, bigint, boolean) from public, anon;
revoke all on function public.poner_en_lista(text, bigint, boolean, text) from public, anon;
revoke all on function public.guardar_temporadas(bigint, jsonb, jsonb, boolean, text) from public, anon;
grant execute on function public.lista_con(jsonb, bigint, boolean) to authenticated;
grant execute on function public.poner_en_lista(text, bigint, boolean, text) to authenticated;
grant execute on function public.guardar_temporadas(bigint, jsonb, jsonb, boolean, text) to authenticated;

-- Respuestas de OMDb ya consultadas, compartidas por todos. Solo las lee y escribe la función «omdb»
-- (supabase/functions/omdb), que guarda la clave de OMDb como secreto OMDB_API_KEY.
create table if not exists public.omdb_cache (
    imdb_id    text not null,
    plot       text not null check (plot in ('short', 'full')),
    datos      jsonb not null,
    consultado timestamptz not null default now(),
    primary key (imdb_id, plot)
);
alter table public.omdb_cache enable row level security;
revoke all on public.omdb_cache from anon, authenticated;

-- Cambios en vivo: si cambias algo en el móvil, el ordenador lo ve al momento.
do $$
begin
    alter publication supabase_realtime add table public.preferencias;
exception when duplicate_object then null;
end $$;
