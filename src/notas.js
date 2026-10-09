// Notas de IMDb, Rotten Tomatoes y Metacritic ya consultadas en OMDb, guardadas en este navegador durante un tiempo.
// La clave gratuita de OMDb solo da 1000 consultas al día: así, ordenar otra vez por notas no vuelve a gastarlas.
const CLAVE = 'buscapelis-notas';
const DURACION = 30 * 24 * 60 * 60 * 1000; // 30 días: las notas cambian poco
const MAXIMO = 8000; // como mucho, unas 8000 obras (unos 400 KB)

let notas = null;

const cargar = () => {
    if (notas) return notas;
    try { notas = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { notas = {}; }
    return notas;
};

// Notas guardadas de una obra ({ imdb, rt, meta }), o null si no están o han caducado.
export const notaGuardada = (tipo, id) => {
    const n = cargar()[`${tipo}_${id}`];
    if (!n || Date.now() - n.t > DURACION) return null;
    return { imdb: n.imdb, rt: n.rt, meta: n.meta };
};

export const guardarNotas = (tipo, nuevas) => {
    const todas = cargar();
    const ahora = Date.now();
    Object.entries(nuevas).forEach(([id, n]) => { todas[`${tipo}_${id}`] = { ...n, t: ahora }; });
    const claves = Object.keys(todas);
    if (claves.length > MAXIMO) {
        claves.sort((a, b) => todas[a].t - todas[b].t).slice(0, claves.length - MAXIMO).forEach(k => delete todas[k]);
    }
    try { localStorage.setItem(CLAVE, JSON.stringify(todas)); } catch { /* sin espacio o bloqueado: solo se pierde la memoria */ }
};
