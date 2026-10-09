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

-- Bibliotecas compartidas: «dueno» deja ver a «invitado» las pestañas indicadas (favorites, pending, watched) de sus
-- películas y series. Solo en ese sentido: compartir con alguien no hace que él comparta contigo. Nadie lee la tabla
-- directamente: todo pasa por las funciones de abajo, que miran quién está conectado (y así nadie ve la clave de Gemini
-- ni las pestañas que no le han compartido).
create table if not exists public.compartidos (
    dueno    uuid not null references auth.users (id) on delete cascade,
    invitado uuid not null references auth.users (id) on delete cascade,
    pestanas text[] not null check (cardinality(pestanas) > 0 and pestanas <@ array['favorites', 'pending', 'watched']),
    creado   timestamptz not null default now(),
    primary key (dueno, invitado),
    check (dueno <> invitado)
);
create index if not exists compartidos_invitado on public.compartidos (invitado);
alter table public.compartidos enable row level security;
revoke all on public.compartidos from anon, authenticated;

-- Comparte (o cambia qué pestañas compartes) con la cuenta de ese correo. Sin pestañas, deja de compartir.
create or replace function public.compartir_biblioteca(p_email text, p_pestanas text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_invitado uuid;
    v_pestanas text[];
begin
    if auth.uid() is null then raise exception 'Hay que entrar con una cuenta.'; end if;
    select id into v_invitado from auth.users where lower(email) = lower(trim(p_email));
    if v_invitado is null then raise exception 'No hay ninguna cuenta con el correo %.', trim(p_email); end if;
    if v_invitado = auth.uid() then raise exception 'Ese correo es el tuyo.'; end if;
    select coalesce(array_agg(distinct p), '{}') into v_pestanas
        from unnest(p_pestanas) p where p in ('favorites', 'pending', 'watched');
    if cardinality(v_pestanas) = 0 then
        delete from public.compartidos where dueno = auth.uid() and invitado = v_invitado;
    else
        insert into public.compartidos (dueno, invitado, pestanas) values (auth.uid(), v_invitado, v_pestanas)
        on conflict (dueno, invitado) do update set pestanas = excluded.pestanas;
    end if;
end $$;

-- Deja de ver la biblioteca que esa persona te comparte (para dejar de compartir la tuya: compartir_biblioteca sin pestañas).
drop function if exists public.dejar_de_compartir(uuid);
create or replace function public.dejar_de_ver(p_dueno uuid)
returns void language sql security definer set search_path = '' as $$
    delete from public.compartidos where invitado = auth.uid() and dueno = p_dueno
$$;

-- Con quién compartes («doy», con las pestañas) y quién comparte contigo («recibo», con las pestañas y sus listas,
-- solo las claves de esas pestañas: p. ej. favorites_movie y favorites_tv).
create or replace function public.compartidos()
returns table (direccion text, usuario uuid, email text, pestanas text[], listas jsonb)
language sql stable security definer set search_path = '' as $$
    select 'doy', c.invitado, u.email::text, c.pestanas, null::jsonb
    from public.compartidos c join auth.users u on u.id = c.invitado
    where c.dueno = auth.uid()
    union all
    select 'recibo', c.dueno, u.email::text, c.pestanas,
        coalesce((select jsonb_object_agg(k, coalesce(p.datos -> k, '[]'::jsonb))
                  from unnest(c.pestanas) pe, unnest(array[pe || '_movie', pe || '_tv']) k), '{}'::jsonb)
    from public.compartidos c
        join auth.users u on u.id = c.dueno
        left join public.preferencias p on p.usuario = c.dueno
    where c.invitado = auth.uid()
$$;

revoke all on function public.compartir_biblioteca(text, text[]) from public, anon;
revoke all on function public.dejar_de_ver(uuid) from public, anon;
revoke all on function public.compartidos() from public, anon;
grant execute on function public.compartir_biblioteca(text, text[]) to authenticated;
grant execute on function public.dejar_de_ver(uuid) to authenticated;
grant execute on function public.compartidos() to authenticated;
