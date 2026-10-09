// Intermediario con OMDb: la clave (secreto OMDB_API_KEY) se queda en Supabase y no aparece en la web.
// Solo responde a personas con sesión iniciada en BuscaPelis, y guarda 30 días cada respuesta en la tabla
// «omdb_cache», compartida por todos: una obra ya consultada no vuelve a gastar consultas de la clave.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CABECERAS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
};
const DURACION_MS = 30 * 24 * 60 * 60 * 1000;

const respuesta = (cuerpo: unknown, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: CABECERAS });

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECERAS });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return respuesta({ Response: 'False', Error: 'Hay que entrar en la web para consultar las notas.' }, 401);

    let i = '', plot = 'short';
    try { ({ i, plot = 'short' } = await req.json()); } catch { /* cuerpo vacío o roto */ }
    if (!/^tt\d{5,10}$/.test(i ?? '') || !['short', 'full'].includes(plot)) {
        return respuesta({ Response: 'False', Error: 'Petición no válida.' }, 400);
    }

    const { data: guardada } = await admin.from('omdb_cache').select('datos, consultado').eq('imdb_id', i).eq('plot', plot).maybeSingle();
    if (guardada && Date.now() - new Date(guardada.consultado).getTime() < DURACION_MS) return respuesta(guardada.datos);

    const clave = Deno.env.get('OMDB_API_KEY');
    if (!clave) return respuesta({ Response: 'False', Error: 'Falta la clave de OMDb en Supabase.' }, 500);

    const res = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(clave)}&i=${i}&plot=${plot}`);
    const datos = await res.json().catch(() => ({ Response: 'False', Error: 'OMDb no ha respondido bien.' }));
    if (res.ok && datos.Response === 'True') {
        await admin.from('omdb_cache').upsert({ imdb_id: i, plot, datos, consultado: new Date().toISOString() });
    } else if (guardada) {
        return respuesta(guardada.datos); // OMDb falla (p. ej. sin consultas): mejor una nota antigua que ninguna
    }
    return respuesta(datos, res.ok ? 200 : res.status);
});
