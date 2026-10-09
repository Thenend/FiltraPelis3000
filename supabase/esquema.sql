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

-- Nombres de usuario: lo que ven los demás en vez del correo (al compartir, en «Amigos» y en las tarjetas).
-- Cada cuenta tiene uno, distinto del de los demás (sin mirar mayúsculas), de 3 a 20 letras, números, «.», «_» o «-».
-- Nadie toca la tabla directamente: se lee y se cambia con las funciones de abajo.
create table if not exists public.perfiles (
    usuario uuid primary key references auth.users (id) on delete cascade,
    nombre  text not null check (nombre ~ '^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_.-]{3,20}$')
);
create unique index if not exists perfiles_nombre on public.perfiles (lower(nombre));
alter table public.perfiles enable row level security;
revoke all on public.perfiles from anon, authenticated;

-- El nombre de quien está conectado (null si aún no ha elegido uno).
create or replace function public.mi_nombre()
returns text language sql stable security definer set search_path = '' as $$
    select nombre from public.perfiles where usuario = auth.uid()
$$;

-- Si ese nombre está libre (o es el tuyo). Se puede preguntar antes de crear la cuenta.
create or replace function public.nombre_libre(p_nombre text)
returns boolean language sql stable security definer set search_path = '' as $$
    select not exists (select 1 from public.perfiles
                       where lower(nombre) = lower(trim(p_nombre)) and usuario is distinct from auth.uid())
$$;

-- Elige o cambia tu nombre de usuario.
create or replace function public.poner_nombre(p_nombre text)
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_nombre text := trim(p_nombre);
begin
    if auth.uid() is null then raise exception 'Hay que entrar con una cuenta.'; end if;
    if v_nombre !~ '^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_.-]{3,20}$' then
        raise exception 'El nombre debe tener de 3 a 20 letras, números, puntos, guiones o guiones bajos (sin espacios).';
    end if;
    insert into public.perfiles (usuario, nombre) values (auth.uid(), v_nombre)
    on conflict (usuario) do update set nombre = excluded.nombre;
exception when unique_violation then
    raise exception 'El nombre «%» ya lo tiene otra persona.', v_nombre;
end $$;

-- Al crear la cuenta, guarda el nombre que se eligió en el formulario (si alguien se lo ha quitado justo antes, la
-- cuenta se crea igual y la web pide otro nombre al entrar).
create or replace function public.nombre_al_registrarse()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    if new.raw_user_meta_data ->> 'nombre' is not null then
        begin
            insert into public.perfiles (usuario, nombre) values (new.id, trim(new.raw_user_meta_data ->> 'nombre'));
        exception when unique_violation or check_violation then null;
        end;
    end if;
    return new;
end $$;
drop trigger if exists nombre_al_registrarse on auth.users;
create trigger nombre_al_registrarse after insert on auth.users
    for each row execute function public.nombre_al_registrarse();

revoke all on function public.mi_nombre() from public, anon;
revoke all on function public.nombre_libre(text) from public;
revoke all on function public.poner_nombre(text) from public, anon;
revoke all on function public.nombre_al_registrarse() from public, anon, authenticated;
grant execute on function public.mi_nombre() to authenticated;
grant execute on function public.nombre_libre(text) to anon, authenticated;
grant execute on function public.poner_nombre(text) to authenticated;

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

-- Comparte con esa cuenta las pestañas indicadas (o cambia cuáles). Sin pestañas, deja de compartir.
create or replace function public.cambiar_compartido(p_invitado uuid, p_pestanas text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_pestanas text[];
begin
    if auth.uid() is null then raise exception 'Hay que entrar con una cuenta.'; end if;
    if p_invitado = auth.uid() then raise exception 'Esa cuenta es la tuya.'; end if;
    select coalesce(array_agg(distinct p), '{}') into v_pestanas
        from unnest(p_pestanas) p where p in ('favorites', 'pending', 'watched');
    if cardinality(v_pestanas) = 0 then
        delete from public.compartidos where dueno = auth.uid() and invitado = p_invitado;
    else
        insert into public.compartidos (dueno, invitado, pestanas) values (auth.uid(), p_invitado, v_pestanas)
        on conflict (dueno, invitado) do update set pestanas = excluded.pestanas;
    end if;
end $$;

-- Lo mismo, buscando la cuenta por su nombre de usuario (o por su correo, si lleva «@»). El parámetro se sigue llamando
-- «p_email» por la versión anterior, que solo aceptaba el correo.
create or replace function public.compartir_biblioteca(p_email text, p_pestanas text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
    v_destino text := trim(p_email);
    v_invitado uuid;
begin
    if v_destino like '%@%' then
        select id into v_invitado from auth.users where lower(email) = lower(v_destino);
        if v_invitado is null then raise exception 'No hay ninguna cuenta con el correo %.', v_destino; end if;
    else
        select usuario into v_invitado from public.perfiles where lower(nombre) = lower(v_destino);
        if v_invitado is null then raise exception 'No hay nadie con el nombre de usuario «%».', v_destino; end if;
    end if;
    perform public.cambiar_compartido(v_invitado, p_pestanas);
end $$;

-- Deja de ver la biblioteca que esa persona te comparte (para dejar de compartir la tuya: cambiar_compartido sin pestañas).
drop function if exists public.dejar_de_compartir(uuid);
create or replace function public.dejar_de_ver(p_dueno uuid)
returns void language sql security definer set search_path = '' as $$
    delete from public.compartidos where invitado = auth.uid() and dueno = p_dueno
$$;

-- Con quién compartes («doy», con las pestañas) y quién comparte contigo («recibo», con las pestañas y sus listas,
-- solo las claves de esas pestañas: p. ej. favorites_movie y favorites_tv). De cada persona se da su nombre de usuario
-- (si aún no ha elegido uno, lo que va antes de la @ de su correo), nunca el correo entero. Sustituye a «compartidos()»,
-- que daba el correo.
drop function if exists public.compartidos();
create or replace function public.bibliotecas_compartidas()
returns table (direccion text, usuario uuid, nombre text, pestanas text[], listas jsonb)
language sql stable security definer set search_path = '' as $$
    select 'doy', c.invitado, coalesce(pf.nombre, split_part(u.email::text, '@', 1)), c.pestanas, null::jsonb
    from public.compartidos c
        join auth.users u on u.id = c.invitado
        left join public.perfiles pf on pf.usuario = c.invitado
    where c.dueno = auth.uid()
    union all
    select 'recibo', c.dueno, coalesce(pf.nombre, split_part(u.email::text, '@', 1)), c.pestanas,
        coalesce((select jsonb_object_agg(k, coalesce(p.datos -> k, '[]'::jsonb))
                  from unnest(c.pestanas) pe, unnest(array[pe || '_movie', pe || '_tv']) k), '{}'::jsonb)
    from public.compartidos c
        join auth.users u on u.id = c.dueno
        left join public.perfiles pf on pf.usuario = c.dueno
        left join public.preferencias p on p.usuario = c.dueno
    where c.invitado = auth.uid()
$$;

revoke all on function public.compartir_biblioteca(text, text[]) from public, anon;
revoke all on function public.cambiar_compartido(uuid, text[]) from public, anon;
revoke all on function public.dejar_de_ver(uuid) from public, anon;
revoke all on function public.bibliotecas_compartidas() from public, anon;
grant execute on function public.compartir_biblioteca(text, text[]) to authenticated;
grant execute on function public.cambiar_compartido(uuid, text[]) to authenticated;
grant execute on function public.dejar_de_ver(uuid) to authenticated;
grant execute on function public.bibliotecas_compartidas() to authenticated;


-- Recomendaciones: «de» le recomienda a «para» una película o serie (tipo «movie» o «tv» y su número en TMDB), con una
-- nota opcional. Si vuelve a recomendar la misma, se cambia la nota y la fecha. Quien la recibe la ve en «Recomendadas»
-- hasta que la pasa a Pendientes o la quita («archivada»); no se borra, para que los dos sigan sabiendo quién se la
-- recomendó a quién. Nadie lee la tabla directamente: todo pasa por las funciones de abajo.
create table if not exists public.recomendaciones (
    id     bigint generated always as identity primary key,
    de     uuid not null references auth.users (id) on delete cascade,
    para   uuid not null references auth.users (id) on delete cascade,
    tipo   text not null check (tipo in ('movie', 'tv')),
    obra   bigint not null,
    nota   text check (char_length(nota) <= 300),
    creada timestamptz not null default now(),
    archivada boolean not null default false,
    unique (de, para, tipo, obra),
    check (de <> para)
);
alter table public.recomendaciones add column if not exists archivada boolean not null default false;
create index if not exists recomendaciones_para on public.recomendaciones (para);
create index if not exists recomendaciones_de on public.recomendaciones (de);
alter table public.recomendaciones enable row level security;
revoke all on public.recomendaciones from anon, authenticated;

-- Recomienda una obra a esas cuentas (por su id, como los amigos de «Amigos») y a las de esos nombres de usuario (o
-- correos, si llevan «@»). Devuelve a cuántas personas se ha recomendado.
create or replace function public.recomendar(p_usuarios uuid[], p_nombres text[], p_tipo text, p_obra bigint, p_nota text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
    v_destinos uuid[] := coalesce(p_usuarios, '{}');
    v_nombre text;
    v_usuario uuid;
    v_nota text := nullif(trim(coalesce(p_nota, '')), '');
begin
    if auth.uid() is null then raise exception 'Hay que entrar con una cuenta.'; end if;
    if p_tipo not in ('movie', 'tv') then raise exception 'Tipo de obra desconocido.'; end if;
    if char_length(v_nota) > 300 then raise exception 'La nota no puede pasar de 300 letras.'; end if;
    foreach v_nombre in array coalesce(p_nombres, '{}') loop
        v_nombre := trim(v_nombre);
        continue when v_nombre = '';
        if v_nombre like '%@%' then
            select id into v_usuario from auth.users where lower(email) = lower(v_nombre);
            if v_usuario is null then raise exception 'No hay ninguna cuenta con el correo %.', v_nombre; end if;
        else
            select usuario into v_usuario from public.perfiles where lower(nombre) = lower(v_nombre);
            if v_usuario is null then raise exception 'No hay nadie con el nombre de usuario «%».', v_nombre; end if;
        end if;
        v_destinos := v_destinos || v_usuario;
    end loop;
    v_destinos := array(select distinct d from unnest(v_destinos) d where exists (select 1 from auth.users u where u.id = d));
    if auth.uid() = any (v_destinos) then raise exception 'No te puedes recomendar nada a ti.'; end if;
    if cardinality(v_destinos) = 0 then raise exception 'Elige al menos a una persona.'; end if;
    insert into public.recomendaciones (de, para, tipo, obra, nota)
    select auth.uid(), d, p_tipo, p_obra, v_nota from unnest(v_destinos) d
    on conflict (de, para, tipo, obra) do update set nota = excluded.nota, creada = now(), archivada = false;
    return cardinality(v_destinos);
end $$;

-- Las recomendaciones que te han hecho y aún no has quitado, de la más nueva a la más vieja, con el nombre de quien te la
-- hizo. La web ya usa «mis_recomendaciones»; esta queda para las versiones anteriores.
create or replace function public.recomendaciones_recibidas()
returns table (id bigint, de uuid, nombre text, tipo text, obra bigint, nota text, creada timestamptz)
language sql stable security definer set search_path = '' as $$
    select r.id, r.de, coalesce(pf.nombre, split_part(u.email::text, '@', 1)), r.tipo, r.obra, r.nota, r.creada
    from public.recomendaciones r
        join auth.users u on u.id = r.de
        left join public.perfiles pf on pf.usuario = r.de
    where r.para = auth.uid() and not r.archivada
    order by r.creada desc
$$;

-- Todas tus recomendaciones, de la más nueva a la más vieja: las que te han hecho («recibida», con quién te la hizo y si
-- ya la has quitado de «Recomendadas») y las que has hecho tú («hecha», con a quién).
create or replace function public.mis_recomendaciones()
returns table (direccion text, id bigint, usuario uuid, nombre text, tipo text, obra bigint, nota text, creada timestamptz, archivada boolean)
language sql stable security definer set search_path = '' as $$
    select case when r.para = auth.uid() then 'recibida' else 'hecha' end, r.id,
        case when r.para = auth.uid() then r.de else r.para end,
        coalesce(pf.nombre, split_part(u.email::text, '@', 1)), r.tipo, r.obra, r.nota, r.creada, r.archivada
    from public.recomendaciones r
        join auth.users u on u.id = case when r.para = auth.uid() then r.de else r.para end
        left join public.perfiles pf on pf.usuario = u.id
    where r.para = auth.uid() or r.de = auth.uid()
    order by r.creada desc
$$;

-- Quita de tus «Recomendadas» todas las recomendaciones de esa obra (de cualquiera que te la haya recomendado). Se
-- archivan, no se borran: sigues viendo quién te la recomendó.
create or replace function public.quitar_recomendacion(p_tipo text, p_obra bigint)
returns void language sql security definer set search_path = '' as $$
    update public.recomendaciones set archivada = true where para = auth.uid() and tipo = p_tipo and obra = p_obra
$$;

revoke all on function public.recomendar(uuid[], text[], text, bigint, text) from public, anon;
revoke all on function public.recomendaciones_recibidas() from public, anon;
revoke all on function public.mis_recomendaciones() from public, anon;
revoke all on function public.quitar_recomendacion(text, bigint) from public, anon;
grant execute on function public.recomendar(uuid[], text[], text, bigint, text) to authenticated;
grant execute on function public.recomendaciones_recibidas() to authenticated;
grant execute on function public.mis_recomendaciones() to authenticated;
grant execute on function public.quitar_recomendacion(text, bigint) to authenticated;
