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

export const registrarse = async (email, contrasena) => {
    const { data, error } = await supabase.auth.signUp({
        email, password: contrasena, options: { emailRedirectTo: window.location.origin + window.location.pathname },
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
