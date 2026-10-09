import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { cargarPreferencias, guardarPreferencias, suscribirPreferencias, consultarOmdb, ponerEnLista, guardarTemporadas, cargarCompartidos, cargarRecomendaciones, quitarRecomendacion } from './datos';
import BarraCuenta from './BarraCuenta';
import { notaGuardada, guardarNotas } from './notas';
import ExtendedInfoModal from './componentes/ExtendedInfoModal';
import SeasonSelectorModal from './componentes/SeasonSelectorModal';
import PlatformAnalysisModal from './componentes/PlatformAnalysisModal';
import ContentCard from './componentes/ContentCard';
import CompartirModal, { PESTANAS_COMPARTIBLES } from './componentes/CompartirModal';
import DualRangeSlider from './componentes/DualRangeSlider';
import RecomendarModal from './componentes/RecomendarModal';


// Main App component
const App = ({ user, nombre, onNombreCambiado }) => {
    const [searchType, setSearchType] = useState('movie'); 
    const currentYear = new Date().getFullYear();
    
    // --- Preference State ---
    const [userLists, setUserLists] = useState({
        movie: { watched: [], discarded: [], favorites: [], pending: [] },
        tv:    { 
            watched: [], discarded: [], favorites: [], pending: [], 
            watchedSeasons: {}, // { showId: [1, 2] }
            watchingSeasons: {} // { showId: [3] }
        }
    });
    
    const [hideWatched, setHideWatched] = useState(false); 
    const [hideDiscarded, setHideDiscarded] = useState(false);

    // --- TV Specific State ---
    const [tvSeasonDetailsCache, setTvSeasonDetailsCache] = useState({});
    const [seasonModal, setSeasonModal] = useState({ isOpen: false, showId: null, showTitle: '' });

    // --- Providers & Availability State ---
    const [itemProvidersCache, setItemProvidersCache] = useState({});

    // --- View Mode State ---
    const [viewMode, setViewMode] = useState('search');

    // --- Bibliotecas compartidas ---
    // Con quién compartes y quién comparte contigo (con sus listas de las pestañas compartidas). Ver datos.js.
    const [compartidos, setCompartidos] = useState([]);
    const [compartirAbierto, setCompartirAbierto] = useState(false);
    // Qué amigo y qué pestaña suya (una o ninguna) se ven en la pestaña «Amigos».
    // Con pestanas a null, la primera que comparte.
    const [amigoSel, setAmigoSel] = useState({ usuario: null, pestanas: null });

    // --- Recomendaciones ---
    // Las que te han hecho (ver datos.js) y la obra que estás recomendando ({ tipo, id, titulo }) o null.
    const [recomendaciones, setRecomendaciones] = useState([]);
    const [obraARecomendar, setObraARecomendar] = useState(null);
    // Fecha de la recomendación más nueva que ya has visto, de películas y de series: { movie, tv }. Se guarda en tus
    // preferencias, así vale en todos tus dispositivos; las posteriores son «nuevas». undefined mientras cargan.
    const [recVistas, setRecVistas] = useState(undefined);
    // Qué se ve en «Recomendadas»: las que tienes por mirar, todas las que te han recomendado o las que has recomendado tú.
    const [recModo, setRecModo] = useState('porMirar');
    // Las que eran nuevas al abrir «Recomendadas», para marcarlas mientras sigas ahí.
    const [recResaltadas, setRecResaltadas] = useState([]);
    const [avisoRecCerrado, setAvisoRecCerrado] = useState(false);
    // Pestaña a abrir después de cambiar entre Películas y Series (al cambiar, se vuelve a «Explorar»).
    const vistaTrasCambiarTipo = useRef(null);

    // --- Filters ---
    const [genres, setGenres] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState('');
    const [titleFilter, setTitleFilter] = useState('');
    const [peopleFilter, setPeopleFilter] = useState('');
    const [recognizedPeople, setRecognizedPeople] = useState([]);
    
    // Nuevos filtros de rango
    const [yearRange, setYearRange] = useState([1900, currentYear]);
    const [ratingRange, setRatingRange] = useState([0, 10]);
    const [votesRange, setVotesRange] = useState([0, 1000]); 
    
    // --- Data & Providers & Settings ---
    const [watchProviders, setWatchProviders] = useState([]);
    const [selectedProviders, setSelectedProviders] = useState([]);
    const [filterByStreaming, setFilterByStreaming] = useState(false);

    // --- SORTING STATE ---
    const [sortBy, setSortBy] = useState('tmdb_rating'); 
    const [omdbCache, setOmdbCache] = useState({}); 
    const [isSortingLoading, setIsSortingLoading] = useState(false);
    const [sortingProgress, setSortingProgress] = useState(0);

    const [pendingSearch, setPendingSearch] = useState(false);

    const [content, setContent] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // --- CACHING STATES ---
    const [lastSearchResults, setLastSearchResults] = useState([]); 
    // Tipo (movie/tv) de lastSearchResults: al pasar de Series a Películas no se deben volver a mostrar las series.
    const lastSearchResultsType = useRef(null);
    const contentCache = useRef({}); 
    // Número de la carga de tarjetas en curso. Cada cambio de pestaña, de Películas/Series o búsqueda nueva lo sube,
    // y una carga que termina con un número viejo se descarta: si no, sus tarjetas acabarían en la sección nueva.
    const cargaActual = useRef(0);

    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState('');
    
    // --- OMDb Info Modal State ---
    const [infoModalState, setInfoModalState] = useState({ isOpen: false, data: null, loading: false, error: null });

    // --- Platform Analysis State ---
    const [analysisModal, setAnalysisModal] = useState({ isOpen: false, loading: false, data: [], progress: 0, total: 0 });

    // LLM States
    const [llmPrompt, setLlmPrompt] = useState('');
    const [llmResponse, setLlmResponse] = useState('');
    const [mentionedContent, setMentionedContent] = useState([]);
    const [llmLoading, setLlmLoading] = useState(false);
    const [llmError, setErrorLLM] = useState(null);
    
    const [randomlyChosenContent, setRandomlyChosenContent] = useState(null);
    const [showRandomChoiceOnly, setShowRandomChoiceOnly] = useState(false);
    const [lastRandomlyChosenId, setLastRandomlyChosenId] = useState(null);
    const isMarkedLoaded = true;
    const [geminiKey, setGeminiKey] = useState('');

    const fileInputRef = useRef(null);

    const TMDB_API_KEY = 'e9f3911cf980b7c06cbefcd31e6d73bc';
    const CONTENT_TO_FETCH_COUNT = 1000;
    const CONTENT_PER_PAGE = 20;
    const WATCH_REGION = 'ES';
    // «gemini-flash-latest» apunta siempre al modelo Flash actual de Google (el «gemini-2.0-flash» de Canvas se retira).
    const GEMINI_MODEL = 'gemini-flash-latest';

    // Datos guardados en Supabase: los mismos campos que el documento de Firestore de la versión de Gemini Canvas.
    const aplicarPreferencias = useCallback((data) => {
        if (!data) return;
        setUserLists({
            movie: {
                watched: data.watched_movie || [],
                discarded: data.discarded_movie || [],
                favorites: data.favorites_movie || [],
                pending: data.pending_movie || []
            },
            tv: {
                watched: data.watched_tv || [],
                discarded: data.discarded_tv || [],
                favorites: data.favorites_tv || [],
                pending: data.pending_tv || [],
                watchedSeasons: data.watchedSeasons_tv || {},
                watchingSeasons: data.watchingSeasons_tv || {}
            }
        });
        if (data.selected_providers) setSelectedProviders(data.selected_providers);
        if (typeof data.filter_by_streaming !== 'undefined') setFilterByStreaming(data.filter_by_streaming);
        setGeminiKey(data.gemini_key || '');
        setRecVistas(data.recomendadas_vistas || {});
    }, []);

    useEffect(() => {
        if (!user) return;
        let activo = true;
        cargarPreferencias()
            .then(data => { if (activo) aplicarPreferencias(data); })
            .catch(error => console.error("Error loading preferences:", error));
        const unsubscribe = suscribirPreferencias(user.id, aplicarPreferencias);
        return () => { activo = false; unsubscribe(); };
    }, [user, aplicarPreferencias]);

    // Las listas de los amigos y las recomendaciones no llegan en vivo: se vuelven a pedir al entrar, al volver a la
    // página y al abrir «Amigos» o «Recomendadas».
    const recargarCompartidos = useCallback(async () => {
        try { setCompartidos(await cargarCompartidos()); }
        catch (error) { console.error("Error loading shared libraries:", error); }
    }, []);
    const recargarRecomendaciones = useCallback(async () => {
        try { setRecomendaciones(await cargarRecomendaciones()); }
        catch (error) { console.error("Error loading recommendations:", error); }
    }, []);

    useEffect(() => {
        if (!user) return;
        recargarCompartidos();
        recargarRecomendaciones();
        const alVolver = () => { if (document.visibilityState === 'visible') { recargarCompartidos(); recargarRecomendaciones(); } };
        document.addEventListener('visibilitychange', alVolver);
        return () => document.removeEventListener('visibilitychange', alVolver);
    }, [user, recargarCompartidos, recargarRecomendaciones]);

    const amigos = compartidos.filter(c => c.direccion === 'recibo');
    const amigoVisto = amigos.find(a => a.usuario === amigoSel.usuario) || amigos[0];
    const pestanasVistas = !amigoVisto ? [] : PESTANAS_COMPARTIBLES.map(p => p.clave).filter(p => amigoVisto.pestanas.includes(p))
        .filter((p, i) => amigoSel.pestanas ? amigoSel.pestanas.includes(p) : i === 0);
    const marcarPestanaAmigo = (pestana) => setAmigoSel({ usuario: amigoVisto.usuario,
        pestanas: pestanasVistas.includes(pestana) ? [] : [pestana] });
    const listaDeAmigo = (amigo, pestana, tipo) => amigo?.listas?.[`${pestana}_${tipo}`] || [];

    // Para cada obra (del tipo actual), qué amigos la tienen y en qué pestañas compartidas: { id: [{ nombre, pestanas }] }
    const amigosPorObra = {};
    amigos.forEach(a => {
        PESTANAS_COMPARTIBLES.forEach(p => {
            if (!a.pestanas.includes(p.clave)) return;
            listaDeAmigo(a, p.clave, searchType).forEach(id => {
                const lista = amigosPorObra[id] || (amigosPorObra[id] = []);
                let entrada = lista.find(e => e.usuario === a.usuario);
                if (!entrada) lista.push(entrada = { usuario: a.usuario, nombre: a.nombre, pestanas: [] });
                entrada.pestanas.push(p.clave);
            });
        });
    });

    // Las que te han hecho (todas, y las que aún no has pasado a Pendientes ni quitado) y las que has hecho tú.
    const recRecibidas = recomendaciones.filter(r => r.direccion === 'recibida');
    const recPorMirar = recRecibidas.filter(r => !r.archivada);
    const recHechas = recomendaciones.filter(r => r.direccion === 'hecha');

    // Para cada obra (del tipo actual), quién te la ha recomendado y a quién se la has recomendado tú:
    // { id: [{ id, nombre, nota, archivada, nueva }] } y { id: [{ id, nombre, nota }] }
    const agrupar = (lista) => {
        const porObra = {};
        lista.filter(r => r.tipo === searchType).forEach(r => {
            (porObra[r.obra] || (porObra[r.obra] = [])).push({ ...r, nueva: recResaltadas.includes(r.id) });
        });
        return porObra;
    };
    const recibidasPorObra = agrupar(recRecibidas);
    const hechasPorObra = agrupar(recHechas);
    const obrasDe = (lista) => [...new Set(lista.filter(r => r.tipo === searchType).map(r => r.obra))];
    const recomendadas = obrasDe(recPorMirar);
    const obrasRecModo = recModo === 'hechas' ? obrasDe(recHechas) : recModo === 'recibidas' ? obrasDe(recRecibidas) : recomendadas;

    // A quién se puede recomendar con un clic: con quien compartes, quien comparte contigo y con quien te has
    // recomendado algo.
    const amigosParaRecomendar = [];
    [...compartidos.map(c => ({ usuario: c.usuario, nombre: c.nombre })), ...recomendaciones.map(r => ({ usuario: r.usuario, nombre: r.nombre }))]
        .forEach(a => { if (!amigosParaRecomendar.some(x => x.usuario === a.usuario)) amigosParaRecomendar.push(a); });
    amigosParaRecomendar.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Recomendaciones nuevas (de películas y de series): las que llegaron después de la última que viste de ese tipo.
    const recNuevas = recVistas === undefined ? []
        : recPorMirar.filter(r => !recVistas[r.tipo] || new Date(r.creada) > new Date(recVistas[r.tipo]));
    const recNuevasAqui = recNuevas.filter(r => r.tipo === searchType);

    // Al abrir «Recomendadas», las de este tipo dejan de ser nuevas (pero se siguen marcando mientras estés ahí).
    useEffect(() => {
        if (viewMode !== 'recomendadas') { setRecResaltadas([]); return; }
        if (recNuevasAqui.length === 0 || recModo === 'hechas') return;
        setRecResaltadas(prev => [...prev, ...recNuevasAqui.map(r => r.id)]);
        const masNueva = recNuevasAqui.reduce((max, r) => (new Date(r.creada) > new Date(max) ? r.creada : max), recNuevasAqui[0].creada);
        setRecVistas(prev => ({ ...prev, [searchType]: masNueva }));
        guardarPreferencias({ recomendadas_vistas: { ...recVistas, [searchType]: masNueva } })
            .catch(error => console.error("Error saving seen recommendations:", error));
    }, [viewMode, searchType, recModo, recNuevasAqui.map(r => r.id).join(',')]);

    // «Ver» del aviso: abre «Recomendadas» en Películas o Series, donde esté la más nueva.
    const verRecomendadasNuevas = () => {
        const tipo = recNuevas[0]?.tipo || searchType;
        recargarRecomendaciones();
        setRecModo('porMirar');
        if (tipo === searchType) setViewMode('recomendadas');
        else { vistaTrasCambiarTipo.current = 'recomendadas'; setSearchType(tipo); }
    };

    const abrirRecomendar = (id, titulo) => setObraARecomendar({ tipo: searchType, id, titulo });

    // «⏳ A pendientes» en «Recomendadas»: la pone en Pendientes (si no estaba) y la quita de Recomendadas.
    const quitarDeRecomendadas = async (id, aPendientes) => {
        const tipo = searchType;
        setRecomendaciones(prev => prev.map(r => r.direccion === 'recibida' && r.tipo === tipo && r.obra === id ? { ...r, archivada: true } : r));
        try {
            if (aPendientes && !userLists[tipo].pending.includes(id)) {
                setUserLists(prev => ({ ...prev, [tipo]: { ...prev[tipo], pending: [...prev[tipo].pending, id] } }));
                await ponerEnLista(`pending_${tipo}`, id, true);
            }
            await quitarRecomendacion(tipo, id);
        } catch (error) {
            console.error("Error removing recommendation:", error);
            showMessage("No se ha podido guardar el cambio. Revisa la conexión.");
            recargarRecomendaciones();
        }
    };

    // Las obras de la pestaña que se está viendo (las tuyas, las del amigo elegido en «Amigos» o las recomendadas).
    const listaDeVista = () => {
        if (viewMode === 'recomendadas') return obrasRecModo;
        if (viewMode === 'amigos') return [...new Set(pestanasVistas.flatMap(p => listaDeAmigo(amigoVisto, p, searchType)))];
        const currentLists = userLists[searchType];
        return viewMode === 'favorites' ? currentLists.favorites : viewMode === 'pending' ? currentLists.pending : viewMode === 'watched' ? currentLists.watched : currentLists.discarded;
    };
    // En «Amigos» y «Recomendadas» la lista viene de otras personas: qué se está viendo y qué obras tiene ahora.
    const claveVistaAmigo = viewMode === 'amigos' ? `${searchType}_${amigoVisto?.usuario}_${pestanasVistas.join('+')}`
        : viewMode === 'recomendadas' ? `${searchType}_recomendadas_${recModo}` : '';
    const idsVistaAmigo = viewMode === 'amigos' || viewMode === 'recomendadas' ? listaDeVista().join(',') : '';

    const updateStreamingPrefsInFirestore = async (newSelected, newFilterState) => {
        if (!user) return;
        try {
            await guardarPreferencias({ selected_providers: newSelected, filter_by_streaming: newFilterState });
        } catch (error) { console.error("Error updating streaming prefs:", error); }
    };

    const toggleList = async (id, listName) => {
        const currentTypeLists = userLists[searchType];
        const currentList = currentTypeLists[listName];
        const poner = !currentList.includes(id);
        const newList = poner ? [...currentList, id] : currentList.filter(itemId => itemId !== id);
        setUserLists(prev => ({ ...prev, [searchType]: { ...prev[searchType], [listName]: newList } }));
        try {
            await ponerEnLista(`${listName}_${searchType}`, id, poner);
            if (listName === 'watched' && poner) await quitarDePendientes(searchType, id);
        } catch (error) {
            console.error(`Error updating ${listName}_${searchType}:`, error);
            showMessage("No se ha podido guardar el cambio. Revisa la conexión.");
        }
    };

    // Lo que ya has visto entero deja de estar pendiente.
    const quitarDePendientes = async (tipo, id) => {
        if (!userLists[tipo].pending.includes(id)) return;
        setUserLists(prev => ({ ...prev, [tipo]: { ...prev[tipo], pending: prev[tipo].pending.filter(x => x !== id) } }));
        await ponerEnLista(`pending_${tipo}`, id, false);
    };

    const saveWatchedSeasons = async (showId, selectedWatchedSeasons, selectedWatchingSeasons) => {
        if (searchType !== 'tv') return;
        const newWatchedSeasons = { ...userLists.tv.watchedSeasons, [showId]: selectedWatchedSeasons };
        const newWatchingSeasons = { ...userLists.tv.watchingSeasons, [showId]: selectedWatchingSeasons };
        const showDetails = tvSeasonDetailsCache[showId];
        let isFullyWatched = false;
        if (showDetails && showDetails.totalSeasons > 0) {
            const effectiveSeasons = showDetails.seasons.filter(s => s.season_number > 0).length;
            const watchedNormalSeasons = selectedWatchedSeasons.filter(s => s > 0).length;
            if (watchedNormalSeasons >= effectiveSeasons) isFullyWatched = true;
        }

        let newWatchedList = [...userLists.tv.watched];
        if (isFullyWatched) {
            if (!newWatchedList.includes(showId)) newWatchedList.push(showId);
        } else {
            newWatchedList = newWatchedList.filter(id => id !== showId);
        }

        setUserLists(prev => ({ ...prev, tv: { ...prev.tv, watchedSeasons: newWatchedSeasons, watchingSeasons: newWatchingSeasons, watched: newWatchedList } }));

        if (user) {
            try {
                await guardarTemporadas(showId, selectedWatchedSeasons, selectedWatchingSeasons, isFullyWatched);
                if (isFullyWatched) await quitarDePendientes('tv', showId);
            } catch (error) {
                console.error("Error saving seasons:", error);
                showMessage("No se ha podido guardar el cambio. Revisa la conexión.");
            }
        }
    };

    const toggleWatched = (id, title) => {
        if (searchType === 'tv') {
            setSeasonModal({ isOpen: true, showId: id, showTitle: title || 'Seleccionar Temporadas' });
            fetchTVDetailsIfNeeded(id);
        } else toggleList(id, 'watched');
    };
    const toggleDiscarded = (id) => toggleList(id, 'discarded');
    const toggleFavorite = (id) => toggleList(id, 'favorites');
    const togglePending = (id) => toggleList(id, 'pending');

    const fetchTVDetailsIfNeeded = async (showId) => {
        if (tvSeasonDetailsCache[showId]) return; 
        try {
            const res = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_API_KEY}&language=es-ES`);
            if (res.ok) {
                const data = await res.json();
                setTvSeasonDetailsCache(prev => ({ ...prev, [showId]: { totalSeasons: data.number_of_seasons, seasons: data.seasons || [] } }));
            }
        } catch (err) { console.error("Error fetching TV details:", err); }
    };

    useEffect(() => {
        if (searchType !== 'tv' || content.length === 0) return;
        const watchedSeasonsMap = userLists.tv.watchedSeasons;
        const watchingSeasonsMap = userLists.tv.watchingSeasons;
        content.forEach(item => {
            const hasActivity = (watchedSeasonsMap[item.id]?.length > 0) || (watchingSeasonsMap[item.id]?.length > 0);
            if (hasActivity && !tvSeasonDetailsCache[item.id]) fetchTVDetailsIfNeeded(item.id);
        });
    }, [content, userLists.tv, searchType, tvSeasonDetailsCache]);

    useEffect(() => {
        if (content.length === 0 || !TMDB_API_KEY) return;
        if (viewMode === 'search' && filterByStreaming) return;

        const fetchProvidersForItems = async () => {
            const itemsToFetch = content.filter(item => !itemProvidersCache[`${searchType}_${item.id}`]);
            if (itemsToFetch.length === 0) return;

            const limitBatch = itemsToFetch.slice(0, 10); 
            const newCacheUpdates = {};
            
            await Promise.all(limitBatch.map(async (item) => {
                try {
                    const res = await fetch(`https://api.themoviedb.org/3/${searchType}/${item.id}/watch/providers?api_key=${TMDB_API_KEY}`);
                    if (res.ok) {
                        const data = await res.json();
                        const flatrate = data.results?.[WATCH_REGION]?.flatrate || [];
                        newCacheUpdates[`${searchType}_${item.id}`] = flatrate.map(p => String(p.provider_id));
                    } else newCacheUpdates[`${searchType}_${item.id}`] = []; 
                } catch (e) { console.error(e); }
            }));

            if (Object.keys(newCacheUpdates).length > 0) setItemProvidersCache(prev => ({ ...prev, ...newCacheUpdates }));
        };

        const timeoutId = setTimeout(fetchProvidersForItems, 500);
        return () => clearTimeout(timeoutId);
    }, [content, searchType, itemProvidersCache, TMDB_API_KEY, viewMode, filterByStreaming]);

    useEffect(() => {
        if (content.length === 0 || !TMDB_API_KEY || searchType === 'tv') return;
        const itemsMissingRuntime = content.filter(item => item.runtime === undefined);
        if (itemsMissingRuntime.length === 0) return;

        const fetchDetails = async () => {
            const miCarga = cargaActual.current; // si mientras tanto se cambia de sección, no tocar las tarjetas nuevas
            const batch = itemsMissingRuntime.slice(0, 5);
            const updates = {};

            await Promise.all(batch.map(async (item) => {
                try {
                    const res = await fetch(`https://api.themoviedb.org/3/movie/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES`);
                    if (res.ok) {
                        const data = await res.json();
                        updates[item.id] = data.runtime ?? null;
                    } else updates[item.id] = null; // sin duración en TMDB (o ya no existe): no volver a pedirla
                    if (contentCache.current[`movie_${item.id}`]) contentCache.current[`movie_${item.id}`].runtime = updates[item.id];
                } catch (e) { console.error(e); }
            }));

            if (miCarga === cargaActual.current && Object.keys(updates).length > 0) {
                setContent(prev => prev.map(item => updates[item.id] !== undefined ? { ...item, runtime: updates[item.id] } : item));
            }
        };

        const timeoutId = setTimeout(fetchDetails, 800); 
        return () => clearTimeout(timeoutId);
    }, [content, searchType, TMDB_API_KEY]);

    const handleExportBackup = () => {
        const backupData = { ...userLists, selectedProviders, filterByStreaming, timestamp: new Date().toISOString(), version: 5 };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `movie-app-backup-v5-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage("Backup guardado.");
    };

    const handleImportClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };
    // Al elegir un backup se pregunta si sustituir todo o combinarlo con lo que ya hay.
    const [backupPendiente, setBackupPendiente] = useState(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try { setBackupPendiente(JSON.parse(e.target.result)); }
            catch (err) { showMessage("Error al leer backup."); }
        };
        reader.readAsText(file);
        event.target.value = ''; 
    };

    const unir = (a = [], b = []) => [...a, ...b.filter(x => !a.includes(x))];
    const unirTemporadas = (a = {}, b = {}) => {
        const r = { ...a };
        Object.entries(b).forEach(([serie, temporadas]) => { r[serie] = unir(a[serie], temporadas).sort((x, y) => x - y); });
        return r;
    };

    const aplicarBackup = async (combinar) => {
        const importedData = backupPendiente;
        setBackupPendiente(null);
        try {
            const newLists = { movie: { ...userLists.movie }, tv: { ...userLists.tv } };
            ['movie', 'tv'].forEach(type => {
                const lista = importedData[type];
                if (!lista) return;
                ['watched', 'discarded', 'favorites', 'pending'].forEach(name => {
                    newLists[type][name] = combinar ? unir(newLists[type][name], lista[name]) : (lista[name] || []);
                });
            });
            if (importedData.tv) {
                newLists.tv.watchedSeasons = combinar ? unirTemporadas(newLists.tv.watchedSeasons, importedData.tv.watchedSeasons) : (importedData.tv.watchedSeasons || {});
                newLists.tv.watchingSeasons = combinar ? unirTemporadas(newLists.tv.watchingSeasons, importedData.tv.watchingSeasons) : (importedData.tv.watchingSeasons || {});
            }
            const providers = combinar ? unir(selectedProviders, importedData.selectedProviders) : (importedData.selectedProviders || []);
            const streaming = combinar ? filterByStreaming : !!importedData.filterByStreaming;

            setUserLists(newLists);
            setSelectedProviders(providers);
            setFilterByStreaming(streaming);

            const cambios = { selected_providers: providers, filter_by_streaming: streaming,
                watchedSeasons_tv: newLists.tv.watchedSeasons, watchingSeasons_tv: newLists.tv.watchingSeasons };
            ['movie', 'tv'].forEach(type => ['watched', 'discarded', 'favorites', 'pending'].forEach(name => {
                cambios[`${name}_${type}`] = newLists[type][name];
            }));
            await guardarPreferencias(cambios);
            showMessage(combinar ? "Backup combinado con tus datos." : "Datos restaurados correctamente.");
        } catch (err) { console.error(err); showMessage("No se ha podido guardar el backup. Revisa la conexión."); }
    };

    const showMessage = (message) => { setModalContent(String(message)); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setModalContent(''); };

    useEffect(() => {
        if (!TMDB_API_KEY || TMDB_API_KEY === 'YOUR_TMDB_API_KEY') return;
        setWatchProviders([]);
        setGenres([]);

        const fetchData = async () => {
            try {
                const [genreRes, provRes] = await Promise.all([
                    fetch(`https://api.themoviedb.org/3/genre/${searchType}/list?api_key=${TMDB_API_KEY}&language=es-ES`),
                    fetch(`https://api.themoviedb.org/3/watch/providers/${searchType}?api_key=${TMDB_API_KEY}&language=es-ES&watch_region=${WATCH_REGION}`)
                ]);
                if (genreRes.ok) setGenres((await genreRes.json()).genres || []);
                if (provRes.ok) setWatchProviders((await provRes.json()).results || []);
            } catch (err) { console.error(err); }
        };
        fetchData();
        setViewMode(vistaTrasCambiarTipo.current || 'search');
        vistaTrasCambiarTipo.current = null;
        setContent([]);
        setLastSearchResults([]);
        setItemProvidersCache({});
        setOmdbCache({}); // una película y una serie pueden tener el mismo número en TMDB
    }, [TMDB_API_KEY, searchType]); 

    const handleProviderChange = (e) => {
        const values = Array.from(e.target.selectedOptions).map(opt => opt.value);
        setSelectedProviders(values);
        updateStreamingPrefsInFirestore(values, filterByStreaming);
    };

    const handleStreamingFilterToggle = (e) => {
        const isChecked = e.target.checked;
        setFilterByStreaming(isChecked);
        updateStreamingPrefsInFirestore(selectedProviders, isChecked);
    };

    const addToCache = (items) => {
        items.forEach(item => {
            if (item && item.id) contentCache.current[`${searchType}_${item.id}`] = item;
        });
    };

    const fetchListItems = useCallback(async (ids, isBackgroundUpdate = false) => {
        const miCarga = isBackgroundUpdate ? cargaActual.current : ++cargaActual.current;
        const sigueVigente = () => miCarga === cargaActual.current;
        if (!isBackgroundUpdate) { setLoading(true); setError(null); setContent([]); setRandomlyChosenContent(null); setShowRandomChoiceOnly(false); setSortBy('tmdb_rating'); }
        if (!ids || ids.length === 0) { if (!isBackgroundUpdate) setLoading(false); setContent([]); return; }

        try {
            const itemsToDisplay = [];
            const missingIds = [];
            ids.forEach(id => {
                if (contentCache.current[`${searchType}_${id}`]) itemsToDisplay.push(contentCache.current[`${searchType}_${id}`]);
                else missingIds.push(id);
            });

            if (missingIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < missingIds.length; i += 20) chunks.push(missingIds.slice(i, i + 20));
                for (const chunk of chunks) {
                    const promises = chunk.map(id => fetch(`https://api.themoviedb.org/3/${searchType}/${id}?api_key=${TMDB_API_KEY}&language=es-ES`).then(r => r.ok ? r.json() : null).catch(()=>null));
                    const results = await Promise.all(promises);
                    const validResults = results.filter(Boolean);
                    addToCache(validResults);
                    itemsToDisplay.push(...validResults);
                }
            }
            if (!sigueVigente()) return;
            itemsToDisplay.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            setContent(itemsToDisplay);
        } catch (err) { if (sigueVigente()) setError("Error al cargar la lista."); } 
        finally { if (!isBackgroundUpdate && sigueVigente()) setLoading(false); }
    }, [searchType, TMDB_API_KEY]);

    // Pide a TMDB las páginas de resultados de 5 en 5 a la vez (antes, una detrás de otra), en orden, hasta tener
    // CONTENT_TO_FETCH_COUNT resultados o acabarse las páginas. Si una página falla, se queda con las anteriores.
    const pedirPaginas = async (urlDePagina, maxPaginas) => {
        const pedir = async (n) => {
            try {
                const res = await fetch(urlDePagina(n));
                return res.ok ? await res.json() : null;
            } catch { return null; }
        };
        const primera = await pedir(1);
        if (!primera) return [];
        let resultados = primera.results || [];
        const ultima = Math.min(maxPaginas, primera.total_pages || 1);
        for (let desde = 2; desde <= ultima && resultados.length < CONTENT_TO_FETCH_COUNT; desde += 5) {
            const numeros = [];
            for (let n = desde; n < desde + 5 && n <= ultima; n++) numeros.push(n);
            const paginas = await Promise.all(numeros.map(pedir));
            for (const pagina of paginas) {
                if (!pagina) return resultados;
                resultados = resultados.concat(pagina.results || []);
            }
        }
        return resultados;
    };

    const fetchContent = useCallback(async () => {
        if (!TMDB_API_KEY) { showMessage("API Key inválida."); return; }
        const miCarga = ++cargaActual.current;
        const sigueVigente = () => miCarga === cargaActual.current;
        setLoading(true);
        setError(null);
        setContent([]);
        setRandomlyChosenContent(null);
        setShowRandomChoiceOnly(false);
        setLastRandomlyChosenId(null);
        setLlmResponse('');
        setMentionedContent([]);

        try {
            let allContent = [];
            const pagesToFetchLimit = Math.ceil(CONTENT_TO_FETCH_COUNT / CONTENT_PER_PAGE);
            
            // --- Resolver Nombres de Personas ---
            let resolvedPeople = [];
            if (peopleFilter.trim()) {
                const names = peopleFilter.split(',').map(n => n.trim()).filter(n => n);
                for (const name of names) {
                    try {
                        const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}&language=es-ES`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.results && data.results.length > 0) resolvedPeople.push({ id: data.results[0].id, name: data.results[0].name });
                        }
                    } catch(e) { console.error("Error buscando persona:", name, e); }
                }
                setRecognizedPeople(resolvedPeople);
            } else setRecognizedPeople([]);

            // Logicas de ruteo dependiendo de limitaciones de API
            const shouldFilterByProviders = filterByStreaming && selectedProviders.length > 0;
            const providersToFilter = shouldFilterByProviders ? selectedProviders : [];
            const hasPeopleFilter = resolvedPeople.length > 0;

            // TMDB NO soporta with_people nativo en Series, hay que engañar al sistema
            const usePersonCreditsForTV = searchType === 'tv' && hasPeopleFilter; 
            const useSearchEndpoint = titleFilter && !shouldFilterByProviders && !hasPeopleFilter;

            if (usePersonCreditsForTV) {
                // 1. Buscamos todas las series en las que salen las personas seleccionadas directamente
                for (const person of resolvedPeople) {
                    const res = await fetch(`https://api.themoviedb.org/3/person/${person.id}/tv_credits?api_key=${TMDB_API_KEY}&language=es-ES`);
                    if (res.ok) {
                        const data = await res.json();
                        allContent = allContent.concat(data.cast || []).concat(data.crew || []);
                    }
                }

                // 2. Eliminamos duplicados tempranos (si alguien sale 2 veces en la misma serie)
                const uniqueTempSet = new Set();
                const deduplicatedContent = [];
                for (const item of allContent) {
                    if (!uniqueTempSet.has(item.id)) {
                        uniqueTempSet.add(item.id);
                        deduplicatedContent.push(item);
                    }
                }
                allContent = deduplicatedContent;

                // 3. Aplicamos el resto de los filtros de forma manual y local
                const searchWords = titleFilter ? titleFilter.toLowerCase().split(' ').filter(word => word.length > 0) : [];
                allContent = allContent.filter(item => {
                    const rating = item.vote_average || 0;
                    const votes = item.vote_count || 0;
                    const itemReleaseDate = item.first_air_date;
                    const itemYear = itemReleaseDate ? parseInt(itemReleaseDate.substring(0, 4)) : 0;
                    const itemGenreIds = item.genre_ids || [];

                    if (selectedGenre && !itemGenreIds.includes(parseInt(selectedGenre))) return false;
                    if (yearRange[0] > 1900 && itemYear < yearRange[0]) return false;
                    if (yearRange[1] < currentYear && itemYear > yearRange[1]) return false;
                    if (rating < ratingRange[0] || rating > ratingRange[1]) return false;
                    if (votes < votesRange[0]) return false;
                    if (votesRange[1] < 1000 && votes > votesRange[1]) return false;
                    
                    if (searchWords.length > 0) {
                        const itemTitle = (item.title || item.name)?.toLowerCase() || '';
                        const itemOverview = item.overview?.toLowerCase() || '';
                        if (!searchWords.every(word => itemTitle.includes(word) || itemOverview.includes(word))) return false;
                    }
                    return true;
                });

                // 4. Filtrado Manual de Plataformas (bastante exigente para TV Credits)
                if (shouldFilterByProviders && allContent.length > 0) {
                    const finalProviderFiltered = [];
                    const batchSize = 10;
                    const newCacheEntries = {}; 

                    for (let i = 0; i < allContent.length; i += batchSize) {
                        const batch = allContent.slice(i, i + batchSize);
                        await Promise.all(batch.map(async (item) => {
                            try {
                                const pRes = await fetch(`https://api.themoviedb.org/3/tv/${item.id}/watch/providers?api_key=${TMDB_API_KEY}`);
                                if (pRes.ok) {
                                    const pData = await pRes.json();
                                    const flatrate = pData.results?.[WATCH_REGION]?.flatrate || [];
                                    const providerIds = flatrate.map(p => String(p.provider_id));
                                    
                                    newCacheEntries[`tv_${item.id}`] = providerIds;
                                    
                                    const isAvailable = providerIds.some(pid => providersToFilter.includes(pid));
                                    if (isAvailable) finalProviderFiltered.push(item);
                                }
                            } catch(e) { console.error(e); }
                        }));
                    }
                    if (Object.keys(newCacheEntries).length > 0) setItemProvidersCache(prev => ({ ...prev, ...newCacheEntries }));
                    allContent = finalProviderFiltered;
                }

            } else if (useSearchEndpoint) {
                // Buscador de Texto (Películas y Series)
                allContent = await pedirPaginas(i => `https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&language=es-ES&include_adult=false&query=${encodeURIComponent(titleFilter)}&page=${i}`, pagesToFetchLimit);
                
                allContent = allContent.filter(item => {
                    const rating = item.vote_average || 0;
                    const votes = item.vote_count || 0;
                    const itemReleaseDate = searchType === 'movie' ? item.release_date : item.first_air_date;
                    const itemYear = itemReleaseDate ? parseInt(itemReleaseDate.substring(0, 4)) : 0;
                    const itemGenreIds = item.genre_ids || [];

                    if (selectedGenre && !itemGenreIds.includes(parseInt(selectedGenre))) return false;
                    if (yearRange[0] > 1900 && itemYear < yearRange[0]) return false;
                    if (yearRange[1] < currentYear && itemYear > yearRange[1]) return false;
                    if (rating < ratingRange[0] || rating > ratingRange[1]) return false;
                    if (votes < votesRange[0]) return false;
                    if (votesRange[1] < 1000 && votes > votesRange[1]) return false;
                    
                    return true;
                });
            } else {
                // Discover API general (Películas sin filtros locales, Series sin actores)
                allContent = await pedirPaginas(i => {
                    let url = `https://api.themoviedb.org/3/discover/${searchType}?api_key=${TMDB_API_KEY}&language=es-ES&include_adult=false&include_video=false&page=${i}`;
                    if (selectedGenre) url += `&with_genres=${selectedGenre}`;
                    if (yearRange[0] > 1900) {
                        const dateParam = searchType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
                        url += `&${dateParam}=${yearRange[0]}-01-01`;
                    }
                    if (yearRange[1] < currentYear) {
                        const dateParam = searchType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
                        url += `&${dateParam}=${yearRange[1]}-12-31`;
                    }
                    if (providersToFilter.length > 0) {
                        url += `&watch_region=${WATCH_REGION}&with_watch_providers=${providersToFilter.join('|')}`;
                    }
                    if (hasPeopleFilter && searchType === 'movie') {
                        const peopleIds = resolvedPeople.map(p => p.id).join(',');
                        url += `&with_people=${peopleIds}`;
                    }
                    if (ratingRange[0] > 0) url += `&vote_average.gte=${ratingRange[0]}`;
                    if (ratingRange[1] < 10) url += `&vote_average.lte=${ratingRange[1]}`;
                    if (votesRange[0] > 0) url += `&vote_count.gte=${votesRange[0]}`;
                    if (votesRange[1] < 1000) url += `&vote_count.lte=${votesRange[1]}`;
                    url += `&sort_by=vote_average.desc`;
                    return url;
                }, pagesToFetchLimit);

                if (titleFilter) {
                    const searchWords = titleFilter.toLowerCase().split(' ').filter(word => word.length > 0);
                    allContent = allContent.filter(item => {
                        const itemTitle = (item.title || item.name)?.toLowerCase() || '';
                        const itemOverview = item.overview?.toLowerCase() || '';
                        return searchWords.every(word => itemTitle.includes(word) || itemOverview.includes(word));
                    });
                }
            }

            const uniqueContentIds = new Set();
            let finalFilteredContent = allContent.filter(item => {
                const isDuplicate = uniqueContentIds.has(item.id);
                uniqueContentIds.add(item.id);
                return !isDuplicate;
            });

            if (!sigueVigente()) return;
            finalFilteredContent.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            const finalResults = finalFilteredContent.slice(0, CONTENT_TO_FETCH_COUNT);
            setContent(finalResults);
            setLastSearchResults(finalResults); 
            lastSearchResultsType.current = searchType;
            addToCache(finalResults);
            if (finalResults.length === 0) showMessage(`No se encontró contenido.`);
        } catch (err) { console.error(err); if (sigueVigente()) setError(`Error al cargar resultados.`); } finally { if (sigueVigente()) setLoading(false); }
    }, [TMDB_API_KEY, selectedGenre, titleFilter, peopleFilter, yearRange, ratingRange, votesRange, selectedProviders, filterByStreaming, searchType, currentYear]);

    useEffect(() => {
        if (viewMode === 'search') {
            cargaActual.current++; // descarta cualquier carga de lista o búsqueda que siguiera en marcha
            setLoading(false);
            if (lastSearchResults.length > 0 && lastSearchResultsType.current === searchType) setContent(lastSearchResults);
            else setContent([]);
        } else {
            fetchListItems(listaDeVista(), false);
        }
    }, [viewMode, searchType, claveVistaAmigo]);

    useEffect(() => {
        if (viewMode === 'search' || viewMode === 'amigos' || viewMode === 'recomendadas') return;
        fetchListItems(listaDeVista(), true);
    }, [userLists]);

    // Si el amigo cambia la lista que estás mirando, o te llegan o quitas recomendaciones, se actualiza al volver a
    // pedirla (al cambiar de amigo o de pestaña ya la carga el efecto de arriba).
    const vistaAmigoAnterior = useRef({ clave: '', ids: '' });
    useEffect(() => {
        const anterior = vistaAmigoAnterior.current;
        vistaAmigoAnterior.current = { clave: claveVistaAmigo, ids: idsVistaAmigo };
        if ((viewMode === 'amigos' || viewMode === 'recomendadas') && anterior.clave === claveVistaAmigo && anterior.ids !== idsVistaAmigo) fetchListItems(listaDeVista(), true);
    }, [claveVistaAmigo, idsVistaAmigo]);


    useEffect(() => {
        if (pendingSearch) {
            fetchContent();
            setPendingSearch(false);
        }
    }, [pendingSearch, fetchContent]);

    // Qué obras hay (sin importar el orden): reordenar la lista no debe volver a empezar a pedir las notas.
    const idsContenido = content.map(c => c.id).sort((a, b) => a - b).join(',');

    useEffect(() => {
        let isCancelled = false; 
        if (sortBy === 'tmdb_rating') {
             const sorted = [...content].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
             const currentIds = content.map(c => c.id).join(',');
             const newIds = sorted.map(c => c.id).join(',');
             if (currentIds !== newIds) setContent(sorted);
             return;
        }

        const fetchExternalRatingsForAll = async () => {
            // Primero, las notas que este navegador ya consultó: no gastan consultas de OMDb.
            const guardadas = {};
            content.forEach(item => {
                if (omdbCache[item.id]) return;
                const n = notaGuardada(searchType, item.id);
                if (n) guardadas[item.id] = n;
            });
            const cacheConGuardadas = Object.keys(guardadas).length > 0 ? { ...omdbCache, ...guardadas } : omdbCache;
            if (cacheConGuardadas !== omdbCache) setOmdbCache(cacheConGuardadas);

            const itemsToFetch = content.filter(item => !cacheConGuardadas[item.id]);
            if (itemsToFetch.length === 0) {
                if (!isCancelled) sortContentByExternal(sortBy, cacheConGuardadas);
                return;
            }

            setIsSortingLoading(true);
            setSortingProgress(0); 

            const chunkSize = 5; 
            const delayBetweenChunks = 300; 
            let processedCount = 0;

            for (let i = 0; i < itemsToFetch.length; i += chunkSize) {
                if (isCancelled) break; 
                const chunk = itemsToFetch.slice(i, i + chunkSize);
                let currentBatchCache = {};
                let paraGuardar = {}; // solo respuestas buenas: si OMDb falla (p. ej. sin consultas), se vuelve a intentar otro día

                await Promise.all(chunk.map(async (item) => {
                    try {
                        const extRes = await fetch(`https://api.themoviedb.org/3/${searchType}/${item.id}/external_ids?api_key=${TMDB_API_KEY}`);
                        if (extRes.status === 404) { // la obra ya no existe en TMDB: sin notas, y no volver a pedirla
                            paraGuardar[item.id] = currentBatchCache[item.id] = { imdb: 0, rt: 0, meta: 0 };
                            return;
                        }
                        if (!extRes.ok) return;
                        const extData = await extRes.json();
                        const imdbId = extData.imdb_id;
                        
                        if (imdbId) {
                            const omdbData = await consultarOmdb(imdbId);
                            if (omdbData.Response === 'True') {
                                paraGuardar[item.id] = currentBatchCache[item.id] = { imdb: omdbData.imdbRating && omdbData.imdbRating !== 'N/A' ? parseFloat(omdbData.imdbRating) : 0, rt: parseOmdbRating(omdbData, 'Rotten Tomatoes'), meta: parseOmdbRating(omdbData, 'Metacritic') };
                            } else currentBatchCache[item.id] = { imdb: 0, rt: 0, meta: 0 }; 
                        } else paraGuardar[item.id] = currentBatchCache[item.id] = { imdb: 0, rt: 0, meta: 0 }; 
                    } catch (e) { console.error("Error fetching rating for", item.title, e); }
                }));

                guardarNotas(searchType, paraGuardar);
                if (isCancelled) break;

                setOmdbCache(prev => {
                    const updated = { ...prev, ...currentBatchCache };
                    sortContentByExternal(sortBy, updated); 
                    return updated;
                });

                processedCount += chunk.length;
                setSortingProgress(Math.min(100, Math.floor((processedCount / itemsToFetch.length) * 100)));
                if (i + chunkSize < itemsToFetch.length) await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
            }
            if (!isCancelled) setIsSortingLoading(false);
        };

        fetchExternalRatingsForAll();
        return () => { isCancelled = true; };
    }, [sortBy, idsContenido, searchType]); 

    const parseOmdbRating = (data, source) => {
        if (!data.Ratings) return 0;
        const r = data.Ratings.find(x => x.Source === source);
        if (!r) return 0;
        if (source === 'Rotten Tomatoes') return parseInt(r.Value.replace('%', '')) || 0;
        if (source === 'Metacritic') return parseInt(r.Value.split('/')[0]) || 0;
        return 0;
    };

    const sortContentByExternal = (criteria, cacheOverride) => {
        const cache = cacheOverride || omdbCache;
        // Ordena la lista actual (prev), no la que había cuando empezó la consulta de notas: así no se pierden
        // las duraciones que han llegado mientras tanto, que si no se volverían a pedir.
        setContent(prev => {
            const sorted = [...prev].sort((a, b) => {
                const ratingsA = cache[a.id] || { imdb: 0, rt: 0, meta: 0 };
                const ratingsB = cache[b.id] || { imdb: 0, rt: 0, meta: 0 };
                let valA = 0; let valB = 0;

                if (criteria === 'imdb') { valA = ratingsA.imdb; valB = ratingsB.imdb; }
                else if (criteria === 'rotten_tomatoes') { valA = ratingsA.rt; valB = ratingsB.rt; }
                else if (criteria === 'metacritic') { valA = ratingsA.meta; valB = ratingsB.meta; }

                if (valA === 0 && valB > 0) return 1;
                if (valB === 0 && valA > 0) return -1;
                if (valA === 0 && valB === 0) return (b.vote_average || 0) - (a.vote_average || 0);
                return valB - valA;
            });

            const currentIds = prev.map(c => c.id).join(',');
            const newIds = sorted.map(c => c.id).join(',');
            return currentIds !== newIds ? sorted : prev;
        });
    };

    const handleExploreClick = () => setViewMode('search');
    const handleSearchClick = () => { setViewMode('search'); setPendingSearch(true); }; // la búsqueda arranca después de cambiar de pestaña, para que no se descarte
    const handleContentClick = (contentId, type) => window.open(`https://www.themoviedb.org/${type}/${contentId}?language=es-ES`, '_blank');
    
    // Función para analizar disponibilidad en plataformas
    const handleAnalyzePlatforms = async () => {
        // Usamos el contenido actualmente cargado en la lista (que son los pendientes ya resueltos)
        const pendingItems = content;
        
        if (pendingItems.length === 0) {
             setAnalysisModal({ isOpen: true, loading: false, data: [], progress: 0, total: 0 });
             return;
        }

        setAnalysisModal({ isOpen: true, loading: true, data: [], progress: 0, total: pendingItems.length });
        
        const analysisData = {};
        const batchSize = 10;
        let processedCount = 0;

        for (let i = 0; i < pendingItems.length; i += batchSize) {
            const batch = pendingItems.slice(i, i + batchSize);
            await Promise.all(batch.map(async (item) => {
                const title = item.title || item.name;
                const id = item.id;

                try {
                    const res = await fetch(`https://api.themoviedb.org/3/${searchType}/${id}/watch/providers?api_key=${TMDB_API_KEY}`);
                    if (res.ok) {
                        const data = await res.json();
                        const flatrate = data.results?.[WATCH_REGION]?.flatrate || [];
                        flatrate.forEach(provider => {
                            if (!analysisData[provider.provider_id]) {
                                analysisData[provider.provider_id] = {
                                    id: provider.provider_id,
                                    name: provider.provider_name,
                                    logo: provider.logo_path,
                                    items: []
                                };
                            }
                            // Evitar duplicados por si acaso
                            if (!analysisData[provider.provider_id].items.some(i => i.id === id)) {
                                analysisData[provider.provider_id].items.push({ id, title });
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error fetching providers for analysis:", id, e);
                }
            }));
            processedCount += batch.length;
            setAnalysisModal(prev => ({ ...prev, progress: processedCount }));
        }

        // Ordenar de mayor cantidad de elementos a menor
        const sortedData = Object.values(analysisData).sort((a, b) => b.items.length - a.items.length);
        setAnalysisModal(prev => ({ ...prev, loading: false, data: sortedData }));
    };

    const handlePersonSearch = useCallback((personName) => {
        setInfoModalState(prev => ({ ...prev, isOpen: false }));
        setViewMode('search');
        setSelectedGenre('');
        setTitleFilter('');
        setYearRange([1900, new Date().getFullYear()]);
        setRatingRange([0, 10]);
        setVotesRange([0, 1000]);
        setPeopleFilter(personName);
        setPendingSearch(true); // Dispara el useEffect para hacer fetch con el nuevo estado
    }, []);

    const handleInfoClick = async (itemId, type) => {
        setInfoModalState({ isOpen: true, data: null, loading: true, error: null });
        try {
            const externalIdsUrl = `https://api.themoviedb.org/3/${type}/${itemId}/external_ids?api_key=${TMDB_API_KEY}`;
            const idsRes = await fetch(externalIdsUrl);
            if (!idsRes.ok) throw new Error('No se pudo conectar con TMDB.');
            const idsData = await idsRes.json();
            const imdbId = idsData.imdb_id;
            if (!imdbId) { setInfoModalState({ isOpen: true, data: null, loading: false, error: 'Esta obra no tiene ficha en IMDb vinculada.' }); return; }

            const omdbData = await consultarOmdb(imdbId, 'full');
            if (omdbData.Response === 'False') throw new Error(omdbData.Error || 'No se encontraron detalles.');

            setInfoModalState({ isOpen: true, data: omdbData, loading: false, error: null });
        } catch (err) {
            console.error(err);
            setInfoModalState(prev => ({ ...prev, loading: false, error: err.message || 'Error desconocido' }));
        }
    };

    const handleChooseRandom = () => {
        const currentLists = userLists[searchType];
        const visibleContent = content.filter(item => {
             if (hideWatched && currentLists.watched.includes(item.id)) return false;
             if (hideDiscarded && currentLists.discarded.includes(item.id)) return false;
             return true;
        });
        if (visibleContent.length > 0) {
            let randomIndex; let chosenItem; let attempts = 0;
            const maxAttempts = visibleContent.length > 1 ? visibleContent.length * 2 : 1;
            do {
                randomIndex = Math.floor(Math.random() * visibleContent.length);
                chosenItem = visibleContent[randomIndex];
                attempts++;
            } while (visibleContent.length > 1 && chosenItem.id === lastRandomlyChosenId && attempts < maxAttempts);
            setRandomlyChosenContent(chosenItem);
            setLastRandomlyChosenId(chosenItem.id);
            setShowRandomChoiceOnly(true);
        } else showMessage("No hay contenido disponible.");
    };

    const handleLlmSubmit = async (e) => {
        e.preventDefault();
        if (!llmPrompt.trim()) { showMessage("Por favor, introduce un prompt."); return; }
        const currentLists = userLists[searchType];
        const visibleContent = content.filter(item => {
             if (hideWatched && currentLists.watched.includes(item.id)) return false;
             if (hideDiscarded && currentLists.discarded.includes(item.id)) return false;
             return true;
        });
        if (visibleContent.length === 0) { showMessage("No hay contenido visible."); return; }
        setLlmLoading(true); setErrorLLM(null); setLlmResponse(''); setMentionedContent([]);
        try {
            const contentListForLlm = visibleContent.map(item => {
                const title = item.title || item.name;
                const year = (item.release_date || item.first_air_date || '').substring(0, 4);
                return `- ${title} (${year})`.trim();
            }).join('\n');
            const fullLlmPrompt = `Lista de ${searchType === 'movie' ? 'películas' : 'series'}:\n\n${contentListForLlm}\n\nPregunta: ${llmPrompt}\n\nResponde sin spoilers.`;
            if (!geminiKey) { setLlmLoading(false); showMessage("Para preguntar a la IA, pon tu clave de Gemini en «🔑 Clave de IA», arriba a la derecha."); return; }
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: fullLlmPrompt }] }] }) });
            if (!response.ok) {
                const detalle = await response.json().catch(() => null);
                throw new Error(response.status === 400 || response.status === 403
                    ? 'La clave de Gemini no es válida. Revísala en «🔑 Clave de IA».'
                    : (detalle?.error?.message || `Error ${response.status} de Gemini.`));
            }
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                setLlmResponse(text);
                const mentionedTitlesRaw = [];
                const regex = /\*\*(.*?)\*\*/g;
                let match;
                while ((match = regex.exec(text)) !== null) if (match[1].toLowerCase() !== 'título') mentionedTitlesRaw.push(match[1]);
                const foundContent = mentionedTitlesRaw.map(t => visibleContent.find(item => {
                    const title = item.title || item.name;
                    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
                    return t.includes(title) || t === `${title} (${year})`; 
                })).filter(Boolean);
                setMentionedContent([...new Set(foundContent)]);
            }
        } catch (err) { console.error(err); setErrorLLM(err.message || "Error al generar respuesta."); } finally { setLlmLoading(false); }
    };

    const currentLists = userLists[searchType]; 
    const displayContent = content.filter(item => {
        if (viewMode !== 'search') return true; 
        if (hideWatched && currentLists.watched.includes(item.id)) return false;
        if (hideDiscarded && currentLists.discarded.includes(item.id)) return false;
        return true;
    });
    const getTabClass = (mode) => `px-4 py-2 font-semibold rounded-t-lg transition-colors duration-200 ${viewMode === mode ? 'bg-gray-800 text-blue-400 border-t-2 border-blue-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white font-inter p-4 sm:p-8 rounded-lg shadow-lg">
            <style>{`
                .custom-range-slider::-webkit-slider-thumb {
                    pointer-events: auto;
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #3b82f6;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.5);
                    transition: all 0.15s ease;
                }
                .custom-range-slider::-webkit-slider-thumb:hover {
                    background: #60a5fa;
                    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.25);
                    transform: scale(1.1);
                }
                .custom-range-slider::-webkit-slider-thumb:active {
                    background: #2563eb;
                    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.4);
                }
                .custom-range-slider::-moz-range-thumb {
                    pointer-events: auto;
                    width: 16px;
                    height: 16px;
                    background: #3b82f6;
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.5);
                    transition: all 0.15s ease;
                }
                .custom-range-slider::-moz-range-thumb:hover {
                    background: #60a5fa;
                    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.25);
                    transform: scale(1.1);
                }
                .custom-range-slider::-moz-range-thumb:active {
                    background: #2563eb;
                    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.4);
                }
            `}</style>
            <div className="max-w-screen-xl mx-auto">
                <BarraCuenta user={user} nombre={nombre} onNombreCambiado={onNombreCambiado} onCompartirClick={() => { recargarCompartidos(); setCompartirAbierto(true); }} geminiKey={geminiKey} onGeminiKeyChange={async (key) => {
                    setGeminiKey(key);
                    await guardarPreferencias({ gemini_key: key });
                }} />
                {recNuevas.length > 0 && !avisoRecCerrado && viewMode !== 'recomendadas' && (
                    <div className="mt-6 mx-auto max-w-2xl bg-rose-900/50 border border-rose-600 rounded-xl px-4 py-3 flex flex-wrap items-center justify-center gap-3 text-center shadow-lg">
                        <span className="text-rose-100">
                            💌 {recNuevas.length === 1
                                ? <>{recNuevas[0].nombre} te ha recomendado {recNuevas[0].tipo === 'movie' ? 'una película' : 'una serie'}.</>
                                : <>Tienes {recNuevas.length} recomendaciones nuevas de {[...new Set(recNuevas.map(r => r.nombre))].join(', ')}.</>}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={verRecomendadasNuevas} className="px-4 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm">Ver</button>
                            <button onClick={() => setAvisoRecCerrado(true)} className="px-3 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm" title="Ocultar el aviso (seguirán como nuevas)">Luego</button>
                        </div>
                    </div>
                )}
                <div className="flex justify-center mt-8 gap-4">
                    <button onClick={() => setSearchType('movie')} className={`px-6 py-2 rounded-full font-bold shadow-lg transition duration-300 ${searchType === 'movie' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Películas</button>
                    <button onClick={() => setSearchType('tv')} className={`px-6 py-2 rounded-full font-bold shadow-lg transition duration-300 ${searchType === 'tv' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Series</button>
                </div>

                <div className="flex flex-wrap justify-center mt-6 border-b border-gray-700 gap-1">
                    <button onClick={handleExploreClick} className={getTabClass('search')}>🔍 Explorar</button>
                    <button onClick={() => setViewMode('favorites')} className={getTabClass('favorites')}>❤️ Favoritas ({currentLists.favorites.length})</button>
                    <button onClick={() => setViewMode('pending')} className={getTabClass('pending')}>⏳ Pendientes ({currentLists.pending.length})</button>
                    <button onClick={() => setViewMode('watched')} className={getTabClass('watched')}>👁️ Vistas ({currentLists.watched.length})</button>
                    <button onClick={() => setViewMode('discarded')} className={getTabClass('discarded')}>❌ Descartadas ({currentLists.discarded.length})</button>
                    {(recomendaciones.length > 0 || viewMode === 'recomendadas') && <button onClick={() => { recargarRecomendaciones(); setRecModo('porMirar'); setViewMode('recomendadas'); }} className={getTabClass('recomendadas')}>💌 Recomendadas ({recomendadas.length}){recNuevasAqui.length > 0 && viewMode !== 'recomendadas' && <span className="ml-1.5 bg-rose-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5" title="Nuevas">{recNuevasAqui.length} nueva{recNuevasAqui.length > 1 ? 's' : ''}</span>}</button>}
                    {amigos.length > 0 && <button onClick={() => { recargarCompartidos(); setViewMode('amigos'); }} className={getTabClass('amigos')}>👥 Amigos</button>}
                </div>
                
                <div className="bg-gray-700 px-4 py-2 flex items-center justify-end gap-2 text-sm border-x border-gray-600">
                    <span className="text-gray-300 font-semibold">Ordenar por:</span>
                    <div className="relative">
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-gray-800 text-white border border-gray-500 rounded px-2 py-1 pr-8 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-gray-700"
                        >
                            <option value="tmdb_rating">⭐ TMDB (Por defecto)</option>
                            <option value="imdb">🟨 IMDb Rating</option>
                            <option value="rotten_tomatoes">🍅 Rotten Tomatoes</option>
                            <option value="metacritic">🟩 Metacritic</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                    {isSortingLoading && <span className="animate-pulse text-xs text-yellow-300" title="Cargando puntuaciones externas...">⏳ Ordenando... {sortingProgress}%</span>}
                </div>

                {viewMode === 'search' && (
                    <div className="bg-gray-800 p-6 rounded-b-xl shadow-2xl mb-8 border border-t-0 border-gray-700">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col">
                                    <label className="text-sm font-semibold mb-1 text-gray-300">Género:</label>
                                    <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Todos</option>
                                        {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm font-semibold mb-1 text-gray-300">Palabras:</label>
                                    <input type="text" value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()} placeholder="Ej: Godzilla" className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>

                                <div className="flex flex-col md:col-span-2">
                                    <label className="text-sm font-semibold mb-1 text-gray-300">Reparto/Dirección (nombres separados por coma):</label>
                                    <input 
                                        type="text" 
                                        value={peopleFilter} 
                                        onChange={(e) => setPeopleFilter(e.target.value)} 
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()} 
                                        placeholder="Ej: Tarantino, Di Caprio, Brad Pitt" 
                                        className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                    />
                                    {recognizedPeople.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2 items-center text-sm">
                                            <span className="text-gray-400 font-semibold">🔍 Filtro usando:</span>
                                            {recognizedPeople.map(p => (
                                                <span key={p.id} className="bg-blue-900/50 text-blue-200 border border-blue-700/50 px-2 py-0.5 rounded shadow-sm">
                                                    {p.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col md:col-span-2">
                                    <DualRangeSlider 
                                        label="Año" min={1900} max={currentYear} step={1} 
                                        value={yearRange} onChange={setYearRange} 
                                        formatValue={v => v} 
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <DualRangeSlider 
                                        label="Nota" min={0} max={10} step={0.1} 
                                        value={ratingRange} onChange={setRatingRange} 
                                        formatValue={v => v.toFixed(1)} 
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <DualRangeSlider 
                                        label="Votos" min={0} max={1000} step={10} 
                                        value={votesRange} onChange={setVotesRange} 
                                        formatValue={v => v === 1000 ? '1000+' : v} 
                                    />
                                </div>

                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" id="hideWatched" checked={hideWatched} onChange={(e) => setHideWatched(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
                                    <label htmlFor="hideWatched" className="text-sm text-gray-300 cursor-pointer select-none">Ocultar vistas</label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" id="hideDiscarded" checked={hideDiscarded} onChange={(e) => setHideDiscarded(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500" />
                                    <label htmlFor="hideDiscarded" className="text-sm text-gray-300 cursor-pointer select-none">Ocultar descartadas</label>
                                </div>
                            </div>
                            <div className="lg:col-span-1 flex flex-col h-full">
                                <label className="text-sm font-semibold mb-1 text-gray-300">Streaming ({WATCH_REGION}):</label>
                                
                                <div className="flex items-center space-x-2 mb-2 bg-gray-700 p-2 rounded">
                                    <input 
                                        type="checkbox" 
                                        id="filterByStreaming" 
                                        checked={filterByStreaming} 
                                        onChange={handleStreamingFilterToggle}
                                        className="w-5 h-5 text-green-600 bg-gray-600 border-gray-500 rounded focus:ring-green-500" 
                                    />
                                    <label htmlFor="filterByStreaming" className="text-sm font-bold text-green-400 cursor-pointer select-none">
                                        Filtrar por mis plataformas
                                    </label>
                                </div>

                                <select 
                                    multiple 
                                    value={selectedProviders} 
                                    onChange={handleProviderChange} 
                                    className={`p-2 rounded border focus:outline-none focus:ring-2 flex-grow h-40 transition-all duration-300 ${
                                        filterByStreaming 
                                            ? 'bg-gray-700 text-white border-gray-600 focus:ring-blue-500' 
                                            : 'bg-gray-900 text-gray-600 border-transparent cursor-default opacity-30 selection:bg-gray-600'
                                    }`} 
                                    title={filterByStreaming ? "Selecciona tus servicios favoritos (usa Ctrl+Click para múltiples)" : "Activa el filtro arriba para habilitar esta lista"}
                                >
                                    {watchProviders.length > 0 ? watchProviders.map((p) => <option key={p.provider_id} value={p.provider_id}>{p.provider_name}</option>) : <option>Cargando...</option>}
                                </select>
                                <p className={`text-xs mt-1 ${filterByStreaming ? 'text-gray-500' : 'text-gray-700'}`}>Selecciona tus servicios aquí. Activa el filtro arriba para usarlos.</p>
                            </div>
                        </div>
                        <div className="flex justify-center mt-6">
                            <button onClick={handleSearchClick} className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none">Buscar {searchType === 'movie' ? 'Películas' : 'Series'}</button>
                        </div>
                    </div>
                )}

                {viewMode !== 'search' && (
                    <div className="text-center py-8">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {viewMode === 'favorites' && '❤️ Tus Favoritas'}
                            {viewMode === 'pending' && '⏳ Tu Lista de Pendientes'}
                            {viewMode === 'watched' && '👁️ Lo que has visto'}
                            {viewMode === 'discarded' && '❌ Lo descartado'}
                            {viewMode === 'recomendadas' && (recModo === 'hechas' ? '📤 Las que has recomendado' : '💌 Te las recomiendan')}
                            {viewMode === 'amigos' && (amigoVisto ? `👥 Biblioteca de ${amigoVisto.nombre}` : '👥 Amigos')}
                        </h2>
                        {viewMode === 'recomendadas' && (
                            <div className="flex flex-col items-center gap-3 mb-4">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {[
                                        { modo: 'porMirar', texto: `📥 Por mirar (${recomendadas.length})` },
                                        { modo: 'recibidas', texto: `💌 Todas las que te recomendaron (${obrasDe(recRecibidas).length})` },
                                        { modo: 'hechas', texto: `📤 Las que has recomendado (${obrasDe(recHechas).length})` },
                                    ].map(m => (
                                        <button key={m.modo} onClick={() => setRecModo(m.modo)}
                                            className={`px-4 py-1 rounded-full text-sm font-semibold ${recModo === m.modo ? 'bg-rose-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                            {m.texto}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-gray-400">
                                    {obrasRecModo.length === 0
                                        ? `No hay ${searchType === 'movie' ? 'películas' : 'series'} aquí.`
                                        : recModo === 'porMirar' ? 'Pásalas a Pendientes o quítalas de aquí cuando quieras: seguirás viendo quién te las recomendó.'
                                        : recModo === 'recibidas' ? 'Con quién te recomendó cada una, aunque ya la hayas pasado a Pendientes o quitado.'
                                        : 'Con a quién se la recomendaste.'}
                                </p>
                            </div>
                        )}
                        {viewMode === 'amigos' && (amigoVisto ? (
                            <div className="flex flex-col items-center gap-3 mb-4">
                                {amigos.length > 1 && (
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {amigos.map(a => (
                                            <button key={a.usuario} onClick={() => setAmigoSel({ usuario: a.usuario, pestanas: amigoSel.pestanas })}
                                                className={`px-4 py-1 rounded-full text-sm font-semibold ${a.usuario === amigoVisto.usuario ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                                {a.nombre}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-wrap justify-center gap-2">
                                    {PESTANAS_COMPARTIBLES.filter(p => amigoVisto.pestanas.includes(p.clave)).map(p => (
                                        <button key={p.clave} onClick={() => marcarPestanaAmigo(p.clave)} title="Pulsa para marcar o desmarcar"
                                            className={`px-4 py-1 rounded-full text-sm font-semibold ${pestanasVistas.includes(p.clave) ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                            {p.icono} {p.nombre} ({listaDeAmigo(amigoVisto, p.clave, searchType).length})
                                        </button>
                                    ))}
                                </div>
                                {pestanasVistas.length === 0 && <p className="text-gray-400 text-sm">Marca una pestaña para ver sus películas y series.</p>}
                            </div>
                        ) : (
                            <p className="text-gray-400 mb-4">Ya nadie comparte su biblioteca contigo.</p>
                        ))}
                        <p className="text-gray-400 capitalize mb-4">
                            Mostrando lista de <span className="text-blue-400 font-bold">{searchType === 'movie' ? 'Películas' : 'Series'}</span>
                        </p>
                        
                        {/* Botón de Análisis para Pendientes */}
                        {viewMode === 'pending' && content.length > 0 && (
                            <button 
                                onClick={handleAnalyzePlatforms} 
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full shadow-lg shadow-indigo-900/50 transform hover:scale-105 transition-all duration-300 border border-indigo-400/50"
                            >
                                <span>📊</span>
                                <span>Analizar Plataformas</span>
                            </button>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <p className="text-red-500 text-center text-xl mt-8">{error}</p>
                ) : (
                    <>
                        {showRandomChoiceOnly && randomlyChosenContent ? (
                            <div className="flex justify-center items-center py-4">
                                <div className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6">
                                {(() => {
                                    const cacheKey = `${searchType}_${randomlyChosenContent.id}`;
                                    const cachedProviders = itemProvidersCache[cacheKey] || [];
                                    const isAvailable = cachedProviders.some(pid => selectedProviders.includes(pid));
                                    const shouldShowAvailability = !(viewMode === 'search' && filterByStreaming);

                                    return (
                                        <ContentCard 
                                            key={randomlyChosenContent.id} 
                                            item={randomlyChosenContent} 
                                            onContentClick={handleContentClick} 
                                            searchType={searchType} 
                                            isRandomlyChosen={true} 
                                            isWatched={currentLists.watched.includes(randomlyChosenContent.id)}
                                            isDiscarded={currentLists.discarded.includes(randomlyChosenContent.id)}
                                            isFavorite={currentLists.favorites.includes(randomlyChosenContent.id)}
                                            isPending={currentLists.pending.includes(randomlyChosenContent.id)}
                                            watchedSeasonsCount={userLists.tv.watchedSeasons[randomlyChosenContent.id]?.length || 0}
                                            watchingSeasonsCount={userLists.tv.watchingSeasons[randomlyChosenContent.id]?.length || 0}
                                            totalSeasonsKnown={tvSeasonDetailsCache[randomlyChosenContent.id]?.totalSeasons || 0}
                                            onToggleWatched={toggleWatched}
                                            onToggleDiscarded={toggleDiscarded}
                                            onToggleFavorite={toggleFavorite}
                                            onTogglePending={togglePending}
                                            isAvailableOnPlatform={shouldShowAvailability && isAvailable}
                                            onInfoClick={handleInfoClick}
                                            externalRating={
                                                sortBy === 'imdb' ? omdbCache[randomlyChosenContent.id]?.imdb :
                                                sortBy === 'rotten_tomatoes' ? omdbCache[randomlyChosenContent.id]?.rt :
                                                sortBy === 'metacritic' ? omdbCache[randomlyChosenContent.id]?.meta : null
                                            }
                                            sortBy={sortBy}
                                            viewMode={viewMode}
                                            amigos={amigosPorObra[randomlyChosenContent.id]}
                                            recomendaciones={recibidasPorObra[randomlyChosenContent.id]}
                                            recomendacionesHechas={hechasPorObra[randomlyChosenContent.id]}
                                            onRecommend={abrirRecomendar}
                                            onRecomendacionPendiente={viewMode === 'recomendadas' && recModo === 'porMirar' ? (id) => quitarDeRecomendadas(id, true) : null}
                                            onRecomendacionQuitar={(id) => quitarDeRecomendadas(id, false)}
                                        />
                                    );
                                })()}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                                {displayContent.map((item) => {
                                    const cacheKey = `${searchType}_${item.id}`;
                                    const cachedProviders = itemProvidersCache[cacheKey] || [];
                                    const isAvailable = cachedProviders.some(pid => selectedProviders.includes(pid));
                                    const shouldShowAvailability = !(viewMode === 'search' && filterByStreaming);
                                    let extRating = null;
                                    if (sortBy === 'imdb') extRating = omdbCache[item.id]?.imdb;
                                    else if (sortBy === 'rotten_tomatoes') extRating = omdbCache[item.id]?.rt;
                                    else if (sortBy === 'metacritic') extRating = omdbCache[item.id]?.meta;

                                    return (
                                        <ContentCard 
                                            key={item.id} 
                                            item={item} 
                                            onContentClick={handleContentClick} 
                                            searchType={searchType} 
                                            isRandomlyChosen={false} 
                                            isWatched={currentLists.watched.includes(item.id)}
                                            isDiscarded={currentLists.discarded.includes(item.id)}
                                            isFavorite={currentLists.favorites.includes(item.id)}
                                            isPending={currentLists.pending.includes(item.id)}
                                            watchedSeasonsCount={userLists.tv.watchedSeasons[item.id]?.length || 0}
                                            watchingSeasonsCount={userLists.tv.watchingSeasons[item.id]?.length || 0}
                                            totalSeasonsKnown={tvSeasonDetailsCache[item.id]?.totalSeasons || 0}
                                            onToggleWatched={toggleWatched}
                                            onToggleDiscarded={toggleDiscarded}
                                            onToggleFavorite={toggleFavorite}
                                            onTogglePending={togglePending}
                                            isAvailableOnPlatform={shouldShowAvailability && isAvailable}
                                            onInfoClick={handleInfoClick}
                                            externalRating={extRating}
                                            sortBy={sortBy}
                                            viewMode={viewMode}
                                            amigos={amigosPorObra[item.id]}
                                            recomendaciones={recibidasPorObra[item.id]}
                                            recomendacionesHechas={hechasPorObra[item.id]}
                                            onRecommend={abrirRecomendar}
                                            onRecomendacionPendiente={viewMode === 'recomendadas' && recModo === 'porMirar' ? (id) => quitarDeRecomendadas(id, true) : null}
                                            onRecomendacionQuitar={(id) => quitarDeRecomendadas(id, false)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
                
                {content.length > 1 && !loading && (
                    <div className="bg-gray-800 p-4 rounded-xl shadow-2xl mt-4 mb-8 border border-gray-700 text-center">
                        <button onClick={handleChooseRandom} className="px-8 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition duration-300">Elige por mí</button>
                    </div>
                )}

                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl mt-8 border border-gray-700">
                     <h2 className="text-2xl font-bold mb-4 text-center text-green-300">Pregunta al IA sobre lo que ves</h2>
                     <form onSubmit={handleLlmSubmit} className="flex flex-col gap-4">
                        <textarea value={llmPrompt} onChange={(e) => setLlmPrompt(e.target.value)} placeholder="Ej: ¿Cuál de estas opciones da más miedo?" rows="3" className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"></textarea>
                        <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-lg focus:outline-none" disabled={llmLoading}>{llmLoading ? 'Pensando...' : 'Preguntar'}</button>
                    </form>
                    {llmError && <p className="mt-4 text-center text-red-400">{llmError}</p>}
                    {llmResponse && (
                        <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
                             {isMarkedLoaded ? <div className="prose prose-invert max-w-none text-gray-200" dangerouslySetInnerHTML={{ __html: marked.parse(llmResponse) }} /> : <p className="text-gray-200 whitespace-pre-wrap">{llmResponse}</p>}
                        </div>
                    )}
                </div>

                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl mt-8 border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4 text-center text-blue-300">Gestión de Copias de Seguridad</h2>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <button onClick={handleExportBackup} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none flex items-center gap-2">💾 Guardar Backup</button>
                        <button onClick={handleImportClick} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition duration-300 ease-in-out focus:outline-none flex items-center gap-2">📂 Cargar Backup</button>
                        <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange}/>
                    </div>
                </div>

                <SeasonSelectorModal 
                isOpen={seasonModal.isOpen}
                onClose={() => setSeasonModal({ ...seasonModal, isOpen: false })}
                showTitle={seasonModal.showTitle}
                seasonsData={tvSeasonDetailsCache[seasonModal.showId]?.seasons || []}
                watchedSeasons={userLists.tv.watchedSeasons[seasonModal.showId] || []}
                watchingSeasons={userLists.tv.watchingSeasons[seasonModal.showId] || []}
                onSave={(selectedWatched, selectedWatching) => saveWatchedSeasons(seasonModal.showId, selectedWatched, selectedWatching)}
            />

            <ExtendedInfoModal 
                isOpen={infoModalState.isOpen}
                onClose={() => setInfoModalState({ ...infoModalState, isOpen: false })}
                data={infoModalState.data}
                loading={infoModalState.loading}
                error={infoModalState.error}
                onPersonClick={handlePersonSearch}
            />

            <CompartirModal
                isOpen={compartirAbierto}
                onClose={() => setCompartirAbierto(false)}
                compartidos={compartidos}
                onCambio={recargarCompartidos}
            />

            <RecomendarModal
                obra={obraARecomendar}
                onClose={() => setObraARecomendar(null)}
                amigos={amigosParaRecomendar}
                onRecomendada={recargarRecomendaciones}
            />

            <PlatformAnalysisModal 
                isOpen={analysisModal.isOpen}
                onClose={() => setAnalysisModal({ ...analysisModal, isOpen: false })}
                data={analysisModal.data}
                loading={analysisModal.loading}
                searchType={searchType}
                progress={analysisModal.progress}
                total={analysisModal.total}
            />

            {backupPendiente && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full text-center">
                            <p className="text-xl font-semibold mb-2 text-gray-200">¿Cómo quieres cargar el backup?</p>
                            <p className="text-gray-400 mb-6">Combinar añade lo del archivo a tus listas. Sustituir borra tus listas actuales y deja solo lo del archivo.</p>
                            <div className="flex flex-wrap justify-center gap-3">
                                <button onClick={() => aplicarBackup(true)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-md">Combinar</button>
                                <button onClick={() => aplicarBackup(false)} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-md">Sustituir</button>
                                <button onClick={() => setBackupPendiente(null)} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-full shadow-md">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )}

            {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 max-w-sm w-full text-center">
                            <p className="text-xl font-semibold mb-6 text-gray-200">{modalContent}</p>
                            <button onClick={closeModal} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-md">Entendido</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;