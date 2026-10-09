// Dónde se guardan las listas y preferencias de cada persona.
// En Supabase, en la tabla «preferencias»: una fila
// por usuario con un JSON con las mismas claves que usaba la versión de Gemini Canvas (watched_movie, pending_tv,
// selected_providers…). Con «npm run dev» (sin VITE_SUPABASE_URL), la web funciona en modo de prueba: todo se guarda
// solo en este navegador.
import { createClient } from '@supabase/supabase-js';

// El proyecto «buscapelis» de Supabase. La clave publicable puede estar en la página: sin una cuenta no da acceso a nada
// (los permisos de supabase/esquema.sql deciden quién ve qué). Las variables del repositorio, si existen, mandan.
const PROYECTO_URL = 'https://gwmhpxeldnsyuecwldkb.supabase.co';
const PROYECTO_CLAVE = 'sb_publishable_IKMoy9dA4Q-6S9gn0Goxiw_dEYN6aRV';
const enDesarrollo = import.meta.env.DEV && !import.meta.env.VITE_SUPABASE_URL;

const url = enDesarrollo ? '' : (import.meta.env.VITE_SUPABASE_URL || PROYECTO_URL).trim().replace(/^(https?:\/\/[^/]+).*$/, '$1');
const clave = enDesarrollo ? '' : (import.meta.env.VITE_SUPABASE_ANON_KEY || PROYECTO_CLAVE).trim();

export const modoPrueba = !url || !clave;
export const supabase = modoPrueba ? null : createClient(url, clave);

// Identifica esta pestaña, para no volver a aplicar los cambios que ella misma acaba de guardar.
const pestana = Math.random().toString(36).slice(2);

const CLAVE_LOCAL = 'buscapelis-preferencias';
const USUARIO_PRUEBA = { id: 'prueba', email: 'modo de prueba' };

const leerLocal = () => {
    try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL)) || {}; } catch { return {}; }
};

// ---------- Cuentas ----------

export const usuarioActual = async () => {
    if (modoPrueba) return USUARIO_PRUEBA;
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
};

export const alCambiarUsuario = (callback) => {
    if (modoPrueba) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => callback(sesion?.user ?? null));
    return () => data.subscription.unsubscribe();
};

export const entrar = async (email, contrasena) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena });
    if (error) throw error;
};

// El nombre de usuario se guarda al crear la cuenta (función «nombre_al_registrarse» de supabase/esquema.sql).
export const registrarse = async (email, contrasena, nombre) => {
    const { data, error } = await supabase.auth.signUp({
        email, password: contrasena,
        options: { emailRedirectTo: window.location.origin + window.location.pathname, data: { nombre } },
    });
    if (error) throw error;
    return { necesitaConfirmar: !data.session };
};

export const recuperarContrasena = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) throw error;
};

export const cambiarContrasena = async (contrasena) => {
    const { error } = await supabase.auth.updateUser({ password: contrasena });
    if (error) throw error;
};

// ---------- Nombre de usuario ----------
// Lo que ven los demás en vez del correo. De 3 a 20 letras, números, «.», «_» o «-», y distinto del de los demás.

export const NOMBRE_VALIDO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_.-]{3,20}$/;
export const AVISO_NOMBRE = 'El nombre debe tener de 3 a 20 letras, números, puntos, guiones o guiones bajos (sin espacios).';

// El nombre de quien ha entrado, o null si aún no ha elegido uno.
export const miNombre = async () => {
    if (modoPrueba) return USUARIO_PRUEBA.email;
    const { data, error } = await supabase.rpc('mi_nombre');
    if (error) throw error;
    return data;
};

export const nombreLibre = async (nombre) => {
    const { data, error } = await supabase.rpc('nombre_libre', { p_nombre: nombre });
    if (error) throw error;
    return data;
};

export const ponerNombre = async (nombre) => {
    const { error } = await supabase.rpc('poner_nombre', { p_nombre: nombre });
    if (error) throw error;
};

export const salir = async () => { if (!modoPrueba) await supabase.auth.signOut(); };

// ---------- Preferencias ----------

export const cargarPreferencias = async () => {
    if (modoPrueba) return leerLocal();
    const { data, error } = await supabase.from('preferencias').select('datos').maybeSingle();
    if (error) throw error;
    return data?.datos ?? {};
};

// Guarda solo las claves indicadas y deja el resto como estaba (como «setDoc(…, { merge: true })» en Firestore).
export const guardarPreferencias = async (cambios) => {
    if (modoPrueba) {
        localStorage.setItem(CLAVE_LOCAL, JSON.stringify({ ...leerLocal(), ...cambios }));
        return;
    }
    const { error } = await supabase.rpc('fusionar_preferencias', { p_datos: { ...cambios, _pestana: pestana } });
    if (error) throw error;
};

// Pone o quita una obra de una lista. Se cambia solo esa obra (no la lista entera), así que dos cambios a la vez desde
// el móvil y el ordenador no se pisan.
export const ponerEnLista = async (clave, id, poner) => {
    if (modoPrueba) {
        const lista = leerLocal()[clave] || [];
        const nueva = poner ? (lista.includes(id) ? lista : [...lista, id]) : lista.filter(x => x !== id);
        return guardarPreferencias({ [clave]: nueva });
    }
    const { error } = await supabase.rpc('poner_en_lista', { p_clave: clave, p_id: id, p_poner: poner, p_pestana: pestana });
    if (error) throw error;
};

// Guarda las temporadas vistas y en curso de una serie y si está vista entera, sin tocar las demás series.
export const guardarTemporadas = async (serieId, vistas, viendo, entera) => {
    if (modoPrueba) {
        const d = leerLocal();
        const lista = d.watched_tv || [];
        return guardarPreferencias({
            watchedSeasons_tv: { ...(d.watchedSeasons_tv || {}), [serieId]: vistas },
            watchingSeasons_tv: { ...(d.watchingSeasons_tv || {}), [serieId]: viendo },
            watched_tv: entera ? (lista.includes(serieId) ? lista : [...lista, serieId]) : lista.filter(x => x !== serieId),
        });
    }
    const { error } = await supabase.rpc('guardar_temporadas', {
        p_serie: serieId, p_vistas: vistas, p_viendo: viendo, p_entera: entera, p_pestana: pestana,
    });
    if (error) throw error;
};

// Avisa cuando las preferencias cambian desde otro dispositivo u otra pestaña.
export const suscribirPreferencias = (usuarioId, callback) => {
    if (modoPrueba) {
        const alGuardar = (e) => { if (e.key === CLAVE_LOCAL) callback(leerLocal()); };
        window.addEventListener('storage', alGuardar);
        return () => window.removeEventListener('storage', alGuardar);
    }
    const canal = supabase
        .channel(`preferencias-${usuarioId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'preferencias', filter: `usuario=eq.${usuarioId}` },
            (cambio) => {
                const datos = cambio.new?.datos;
                if (datos && datos._pestana !== pestana) callback(datos);
            })
        .subscribe();
    return () => { supabase.removeChannel(canal); };
};

// ---------- Bibliotecas compartidas ----------
// Quién ve tus pestañas y quién te deja ver las suyas. Supabase solo devuelve las listas de las pestañas que esa persona
// te ha compartido (función «bibliotecas_compartidas» de supabase/esquema.sql).

// [{ direccion: 'doy' | 'recibo', usuario, nombre, pestanas: ['favorites', …], listas: { favorites_movie: [ids], … } }]
export const cargarCompartidos = async () => {
    if (modoPrueba) return [];
    const { data, error } = await supabase.rpc('bibliotecas_compartidas');
    if (error) throw error;
    return data || [];
};

const sinModoPrueba = () => {
    if (modoPrueba) throw new Error('En el modo de prueba no se puede compartir.');
};

// Comparte con la cuenta de ese nombre de usuario (o correo) las pestañas indicadas.
export const compartirBiblioteca = async (destino, pestanas) => {
    sinModoPrueba();
    const { error } = await supabase.rpc('compartir_biblioteca', { p_email: destino, p_pestanas: pestanas });
    if (error) throw error;
};

// Cambia qué pestañas compartes con alguien con quien ya compartes. Sin pestañas, deja de compartir.
export const cambiarCompartido = async (usuarioId, pestanas) => {
    sinModoPrueba();
    const { error } = await supabase.rpc('cambiar_compartido', { p_invitado: usuarioId, p_pestanas: pestanas });
    if (error) throw error;
};

// Deja de ver la biblioteca que esa persona te comparte.
export const dejarDeVer = async (duenoId) => {
    sinModoPrueba();
    const { error } = await supabase.rpc('dejar_de_ver', { p_dueno: duenoId });
    if (error) throw error;
};

// ---------- Notas de OMDb ----------

// Pide a OMDb los datos de una obra a través de la función «omdb» de Supabase, que guarda la clave en secreto.
// Devuelve siempre la respuesta de OMDb ({ Response: 'True', … } o { Response: 'False', Error }).
export const consultarOmdb = async (imdbId, plot = 'short') => {
    if (modoPrueba) return { Response: 'False', Error: 'En el modo de prueba no se consultan las notas.' };
    const { data, error } = await supabase.functions.invoke('omdb', { body: { i: imdbId, plot } });
    if (!error) return data;
    const cuerpo = await error.context?.json?.().catch(() => null);
    return cuerpo?.Error ? cuerpo : { Response: 'False', Error: 'Error de conexión con OMDb.' };
};
