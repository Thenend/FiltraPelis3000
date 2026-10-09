import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { cargarPreferencias, guardarPreferencias, suscribirPreferencias, consultarOmdb } from './datos';
import BarraCuenta from './BarraCuenta';
import { notaGuardada, guardarNotas } from './notas';

// --- Components ---

// Modal para Detalles Extendidos (OMDb)
const ExtendedInfoModal = ({ isOpen, onClose, data, loading, error, onPersonClick }) => {
    if (!isOpen) return null;

    const renderClickablePeople = (peopleString) => {
        if (!peopleString || peopleString === 'N/A') return <span className="text-white">N/A</span>;
        const people = peopleString.split(',');
        return people.map((person, index) => {
            // Limpiar roles entre paréntesis para la búsqueda (ej: "George Lucas (screenplay)" -> "George Lucas")
            const cleanName = person.replace(/\s*\(.*?\)\s*/g, '').trim();
            return (
                <span key={index}>
                    <span 
                        className="text-white hover:text-blue-400 cursor-pointer underline decoration-dotted transition-colors"
                        onClick={(e) => { e.stopPropagation(); onPersonClick(cleanName); }}
                        title={`Buscar obras de ${cleanName}`}
                    >
                        {person.trim()}
                    </span>
                    {index < people.length - 1 ? ', ' : ''}
                </span>
            );
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
                
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 bg-black bg-opacity-50 rounded-full p-2 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {loading ? (
                    <div className="flex-1 flex justify-center items-center p-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="flex-1 p-10 text-center">
                        <p className="text-red-400 text-xl mb-2">😕</p>
                        <p className="text-gray-300">{error}</p>
                    </div>
                ) : data ? (
                    <>
                        {/* Columna Poster */}
                        <div className="md:w-1/3 h-64 md:h-auto relative">
                            <img 
                                src={data.Poster !== 'N/A' ? data.Poster : 'https://placehold.co/300x450/333333/FFFFFF?text=No+Poster'} 
                                alt={data.Title} 
                                className="w-full h-full object-cover md:rounded-l-2xl opacity-60 md:opacity-100"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent md:hidden"></div>
                            <div className="absolute bottom-4 left-4 right-4 md:hidden">
                                <h2 className="text-2xl font-bold text-white leading-tight shadow-black drop-shadow-lg">{data.Title}</h2>
                                <p className="text-gray-300 text-sm">{data.Year} • {data.Rated}</p>
                            </div>
                        </div>

                        {/* Columna Info */}
                        <div className="md:w-2/3 p-6 md:p-8 text-gray-300 space-y-6">
                            <div className="hidden md:block border-b border-gray-700 pb-4">
                                <h2 className="text-3xl font-bold text-white mb-2">{data.Title}</h2>
                                <div className="flex flex-wrap gap-3 text-sm items-center">
                                    <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded border border-blue-700 font-mono">{data.Rated}</span>
                                    <span>{data.Year}</span>
                                    <span>•</span>
                                    <span>{data.Runtime}</span>
                                    <span>•</span>
                                    <span className="italic">{data.Genre}</span>
                                </div>
                            </div>

                            {/* Puntuaciones */}
                            <div className="flex flex-wrap gap-4">
                                {data.Ratings?.map((r, idx) => {
                                    let color = "border-gray-600 text-gray-400";
                                    let icon = "📊";
                                    if (r.Source === "Internet Movie Database") { color = "border-yellow-600 text-yellow-500"; icon = "⭐"; }
                                    if (r.Source === "Rotten Tomatoes") { color = "border-red-600 text-red-500"; icon = "🍅"; }
                                    if (r.Source === "Metacritic") { color = "border-green-600 text-green-500"; icon = "Ⓜ️"; }
                                    
                                    return (
                                        <div key={idx} className={`px-3 py-2 rounded-lg border ${color} bg-opacity-10 bg-gray-800 flex items-center gap-2 shadow-sm`}>
                                            <span className="text-lg">{icon}</span>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold opacity-70 leading-none mb-1">{r.Source}</div>
                                                <div className="font-bold leading-none">{r.Value}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {data.imdbRating && !data.Ratings?.some(r => r.Source === "Internet Movie Database") && (
                                     <div className="px-3 py-2 rounded-lg border border-yellow-600 text-yellow-500 bg-opacity-10 bg-gray-800 flex items-center gap-2 shadow-sm">
                                        <span className="text-lg">⭐</span>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold opacity-70 leading-none mb-1">IMDb</div>
                                            <div className="font-bold leading-none">{data.imdbRating}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sinopsis */}
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-inner">
                                <p className="leading-relaxed text-gray-200 text-sm md:text-base">
                                    {data.Plot !== 'N/A' ? data.Plot : 'Sinopsis no disponible.'}
                                </p>
                            </div>

                            {/* Detalles Técnicos Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                <div>
                                    <span className="text-gray-500 uppercase text-xs font-bold block mb-1">Director</span>
                                    <div>{renderClickablePeople(data.Director)}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500 uppercase text-xs font-bold block mb-1">Guion</span>
                                    <div>{renderClickablePeople(data.Writer)}</div>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-gray-500 uppercase text-xs font-bold block mb-1">Reparto</span>
                                    <div>{renderClickablePeople(data.Actors)}</div>
                                </div>
                                {data.BoxOffice && data.BoxOffice !== 'N/A' && (
                                    <div>
                                        <span className="text-gray-500 uppercase text-xs font-bold block mb-1">Taquilla</span>
                                        <span className="text-green-400 font-mono">{data.BoxOffice}</span>
                                    </div>
                                )}
                                {data.Awards && data.Awards !== 'N/A' && (
                                    <div className="sm:col-span-2">
                                        <span className="text-gray-500 uppercase text-xs font-bold block mb-1">Premios</span>
                                        <span className="text-yellow-200">🏆 {data.Awards}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

// Modal para Seleccionar Temporadas
const SeasonSelectorModal = ({ isOpen, onClose, showTitle, seasonsData, watchedSeasons, watchingSeasons, onSave }) => {
    const [seasonStatus, setSeasonStatus] = useState({});

    useEffect(() => {
        if (isOpen) {
            const initialStatus = {};
            seasonsData.forEach(s => {
                const sNum = s.season_number;
                if (watchedSeasons.includes(sNum)) initialStatus[sNum] = 'watched';
                else if (watchingSeasons.includes(sNum)) initialStatus[sNum] = 'watching';
                else initialStatus[sNum] = 'none';
            });
            setSeasonStatus(initialStatus);
        }
    }, [isOpen, seasonsData, watchedSeasons, watchingSeasons]);

    if (!isOpen) return null;

    const toggleStatus = (seasonNumber, targetStatus) => {
        setSeasonStatus(prev => {
            const current = prev[seasonNumber] || 'none';
            return { 
                ...prev, 
                [seasonNumber]: current === targetStatus ? 'none' : targetStatus 
            };
        });
    };

    const handleSave = () => {
        const newWatched = [];
        const newWatching = [];
        Object.entries(seasonStatus).forEach(([sNum, status]) => {
            const num = parseInt(sNum);
            if (status === 'watched') newWatched.push(num);
            if (status === 'watching') newWatching.push(num);
        });
        onSave(newWatched, newWatching);
        onClose();
    };

    const markAllWatched = () => {
        const newStatus = {};
        seasonsData.forEach(s => newStatus[s.season_number] = 'watched');
        setSeasonStatus(newStatus);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full relative flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-2 pr-8">{showTitle}</h3>
                <p className="text-gray-400 text-sm mb-4">Gestiona el progreso por temporada:</p>
                
                <div className="flex-1 overflow-y-auto mb-4 min-h-[150px] bg-gray-900 rounded p-2 border border-gray-700">
                    {seasonsData.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-gray-500">Cargando temporadas...</div>
                    ) : (
                        <div className="space-y-2">
                            {seasonsData.filter(s => s.season_number > 0).map(season => {
                                const status = seasonStatus[season.season_number] || 'none';
                                const isWatching = status === 'watching';
                                const isWatched = status === 'watched';

                                return (
                                    <div 
                                        key={season.id} 
                                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 rounded bg-gray-800 border border-gray-700 gap-2"
                                    >
                                        <span className="text-gray-300 font-medium">
                                            {season.name || `Temporada ${season.season_number}`}
                                        </span>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => toggleStatus(season.season_number, 'watching')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1 ${
                                                    isWatching 
                                                        ? 'bg-orange-600 text-white shadow-inner ring-1 ring-orange-400' 
                                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                }`}
                                            >
                                                <span>{isWatching ? '👁️' : '○'}</span> Viendo
                                            </button>
                                            
                                            <button 
                                                onClick={() => toggleStatus(season.season_number, 'watched')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1 ${
                                                    isWatched 
                                                        ? 'bg-green-600 text-white shadow-inner ring-1 ring-green-400' 
                                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                }`}
                                            >
                                                <span>{isWatched ? '✓' : '○'}</span> Vista
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-gray-700 items-center">
                    <button onClick={markAllWatched} className="px-3 py-1 text-xs text-blue-300 hover:text-white mr-auto underline decoration-dotted">Marcar todas vistas</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg text-sm">Guardar</button>
                </div>
            </div>
        </div>
    );
};

// Modal para el Análisis de Plataformas
const PlatformAnalysisModal = ({ isOpen, onClose, data, loading, searchType, progress, total }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70] p-4" onClick={onClose}>
            <div className="bg-gray-900 p-6 rounded-xl shadow-2xl border border-gray-700 max-w-3xl w-full relative flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 bg-black bg-opacity-50 rounded-full p-2 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                <h3 className="text-2xl font-bold text-white mb-2 pr-8">Análisis de Plataformas</h3>
                <p className="text-gray-400 text-sm mb-6 border-b border-gray-700 pb-4">
                    Descubre qué servicios de streaming tienen más contenido de tu lista de pendientes.
                </p>

                {loading ? (
                    <div className="flex-1 flex flex-col justify-center items-center p-12 min-h-[300px]">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
                        <p className="text-blue-300 animate-pulse font-medium">Analizando disponibilidad en plataformas...</p>
                        {total > 0 && (
                            <div className="mt-6 w-full max-w-sm bg-gray-700 rounded-full h-2.5 overflow-hidden shadow-inner">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${(progress / total) * 100}%` }}></div>
                            </div>
                        )}
                        <p className="text-gray-400 text-xs mt-2 font-mono">{progress} / {total} procesados</p>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex-1 flex justify-center items-center p-12 min-h-[200px]">
                        <p className="text-gray-400 text-lg">No se encontraron plataformas para tu lista de pendientes.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {data.map(platform => (
                            <div key={platform.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm transition hover:border-gray-500">
                                <div className="flex items-center gap-4 mb-3 border-b border-gray-700 pb-3">
                                    {platform.logo ? (
                                        <img src={`https://image.tmdb.org/t/p/w92${platform.logo}`} alt={platform.name} className="w-10 h-10 rounded-lg shadow-md" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 shadow-inner">N/A</div>
                                    )}
                                    <h4 className="text-xl font-bold text-gray-200">{platform.name}</h4>
                                    <div className="ml-auto flex items-center">
                                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg">
                                            {platform.items.length} {searchType === 'movie' ? 'películas' : 'series'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {platform.items.map(item => (
                                        <span key={item.id} className="bg-gray-900 border border-gray-600 text-gray-300 text-xs px-2.5 py-1.5 rounded-md hover:bg-gray-700 hover:text-white transition-colors cursor-default" title={item.title}>
                                            {item.title}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ContentCard = ({ 
    item, onContentClick, searchType, isRandomlyChosen, 
    isWatched, isDiscarded, isFavorite, isPending,
    watchedSeasonsCount, watchingSeasonsCount, totalSeasonsKnown,
    onToggleWatched, onToggleDiscarded, onToggleFavorite, onTogglePending,
    isAvailableOnPlatform, 
    onInfoClick,
    externalRating,
    sortBy,
    viewMode
}) => {
    const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : `https://placehold.co/300x450/333333/FFFFFF?text=No+Poster`;
    const title = item.title || item.name || 'Título desconocido';
    const releaseDate = (item.release_date || item.first_air_date || '').substring(0, 4) || 'N/A';

    const isTv = searchType === 'tv';
    const isFullyWatched = isWatched || (isTv && totalSeasonsKnown > 0 && watchedSeasonsCount >= totalSeasonsKnown);
    const hasStarted = isTv && (watchedSeasonsCount > 0 || watchingSeasonsCount > 0);
    
    // Evitar blanco y negro si estamos en la pestaña de favoritas
    const isGrayscale = (isFullyWatched || isDiscarded) && viewMode !== 'favorites';
    
    // Formatear duración
    const formatRuntime = (mins) => {
        if (!mins) return null;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };
    const runtimeText = !isTv && item.runtime ? formatRuntime(item.runtime) : null;

    let borderClass = 'border-gray-700';
    if (isFavorite) borderClass = 'border-pink-500 ring-1 ring-pink-500';
    else if (isDiscarded) borderClass = 'border-red-500';
    else if (isFullyWatched) borderClass = 'border-green-500';
    else if (hasStarted) borderClass = 'border-orange-500';
    else if (isPending) borderClass = 'border-yellow-500';

    const handleAction = (e, action) => { 
        e.stopPropagation(); 
        if (isTv && action === onToggleWatched) {
            action(item.id, title);
        } else if (action) {
            action(item.id);
        }
    };

    let ratingDisplay = <span className="text-yellow-400 font-semibold">★ {item.vote_average?.toFixed(1)}</span>;
    if (sortBy === 'imdb' && externalRating) {
        ratingDisplay = <span className="text-yellow-500 font-bold border border-yellow-500 px-1 rounded text-[10px] bg-yellow-900/30">IMDb {externalRating}</span>;
    } else if (sortBy === 'rotten_tomatoes' && externalRating) {
        ratingDisplay = <span className="text-red-500 font-bold border border-red-500 px-1 rounded text-[10px] bg-red-900/30">🍅 {externalRating}%</span>;
    } else if (sortBy === 'metacritic' && externalRating) {
        ratingDisplay = <span className="text-green-500 font-bold border border-green-500 px-1 rounded text-[10px] bg-green-900/30">Ⓜ️ {externalRating}</span>;
    }

    return (
        <div
            className={`relative bg-gray-800 rounded-xl shadow-xl overflow-hidden border flex flex-col items-center p-3 cursor-pointer transition-all duration-300 hover:scale-105 ${borderClass}`}
            onClick={() => onContentClick(item.id, searchType)}
        >
            <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 items-end">
                {isFavorite && <span className="bg-pink-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-md font-bold">Favorita</span>}
                {isPending && <span className="bg-yellow-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-md font-bold">Pendiente</span>}
                {isFullyWatched && <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-md font-bold">Vista</span>}
                {isDiscarded && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-md font-bold">Descartada</span>}
                {!isFullyWatched && hasStarted && (
                    <span className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-md font-bold">
                        Capítulos pendientes
                    </span>
                )}
            </div>

            {isAvailableOnPlatform && (
                <div className="absolute top-2 left-2 z-10">
                    <span className="bg-green-500 text-white text-[10px] px-2 py-1 rounded-full shadow-lg font-bold flex items-center gap-1 ring-1 ring-white/50">
                        <span>✅</span> Disponible
                    </span>
                </div>
            )}

            <div className="relative w-full">
                <img
                    src={posterUrl}
                    alt={title}
                    className={`w-full h-auto rounded-lg mb-3 object-cover object-center border shadow-sm ${isGrayscale ? 'opacity-60 grayscale' : 'border-gray-600'}`}
                    style={{ aspectRatio: '2/3' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/300x450/333333/FFFFFF?text=No+Poster`; }}
                />
                
                <button 
                    onClick={(e) => { e.stopPropagation(); onInfoClick(item.id, searchType); }}
                    className="absolute bottom-4 right-1 transform translate-x-1/4 translate-y-1/4 bg-gray-900/80 hover:bg-gray-700 text-blue-300 hover:text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border border-gray-600 z-20 transition-all hover:scale-110 backdrop-blur-sm group"
                    title="Ver ficha técnica completa"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-5m0-4h.01" />
                    </svg>
                </button>
            </div>
            
            <div className={`text-center flex flex-col w-full ${isRandomlyChosen ? 'flex-none' : 'flex-grow'}`}>
                <h3 className="font-bold text-blue-200 text-md leading-tight mb-2 line-clamp-2 min-h-[2.5rem]" title={title}>{title}</h3>
                <div className="mt-auto w-full">
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-2 px-1">
                        <span>{releaseDate}</span>
                        {runtimeText && (
                            <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                                {runtimeText}
                            </span>
                        )}
                        {ratingDisplay}
                    </div>
                    
                    {isTv && totalSeasonsKnown > 0 && hasStarted && !isFullyWatched && (
                        <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2 flex overflow-hidden">
                            <div className="bg-green-500 h-1.5" style={{ width: `${Math.min(100, (watchedSeasonsCount / totalSeasonsKnown) * 100)}%` }}></div>
                            <div className="bg-orange-500 h-1.5" style={{ width: `${Math.min(100, (watchingSeasonsCount / totalSeasonsKnown) * 100)}%` }}></div>
                        </div>
                    )}

                    <div className="flex justify-between gap-1 mt-2 pt-2 border-t border-gray-700">
                        <button onClick={(e) => handleAction(e, onToggleWatched)} className={`flex-1 py-1.5 rounded hover:bg-green-900 transition-colors ${isFullyWatched ? 'bg-green-700 text-white' : hasStarted ? 'bg-orange-700 text-white' : 'bg-gray-700 text-gray-400'}`} title={isTv ? "Gestionar Temporadas" : "Marcar como Vista"}>
                            {isTv ? '📺' : '👁️'}
                        </button>
                        <button onClick={(e) => handleAction(e, onToggleFavorite)} className={`flex-1 py-1.5 rounded hover:bg-pink-900 transition-colors ${isFavorite ? 'bg-pink-700 text-white' : 'bg-gray-700 text-gray-400'}`} title="Añadir a Favoritas">❤️</button>
                        <button onClick={(e) => handleAction(e, onTogglePending)} className={`flex-1 py-1.5 rounded hover:bg-yellow-900 transition-colors ${isPending ? 'bg-yellow-700 text-white' : 'bg-gray-700 text-gray-400'}`} title="Marcar como Pendiente">⏳</button>
                        <button onClick={(e) => handleAction(e, onToggleDiscarded)} className={`flex-1 py-1.5 rounded hover:bg-red-900 transition-colors ${isDiscarded ? 'bg-red-700 text-white' : 'bg-gray-700 text-gray-400'}`} title="Descartar">❌</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente de Slider de Rango Dual
const DualRangeSlider = ({ label, min, max, step, value, onChange, formatValue }) => {
    const [minVal, maxVal] = value;
    const minPercent = ((minVal - min) / (max - min)) * 100;
    const maxPercent = ((maxVal - min) / (max - min)) * 100;

    // Lógica para evitar que se atasquen en los extremos:
    // Si están en la mitad derecha del rango, ponemos el tirador "mínimo" por encima
    // para poder arrastrarlo hacia la izquierda. Si están en la mitad izquierda, el "máximo" está encima.
    const isMinOnTop = minVal >= (max + min) / 2;

    return (
        <div className="flex flex-col h-full justify-end w-full">
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-300">{label}:</label>
                <div className="text-sm text-blue-300 font-medium bg-gray-900/80 px-3 py-1 rounded-md border border-gray-700/50 shadow-inner flex items-center gap-2 tracking-wide">
                    <span>{formatValue(minVal)}</span>
                    <span className="text-gray-500 text-xs font-normal">→</span>
                    <span>{formatValue(maxVal)}</span>
                </div>
            </div>
            
            {/* Contenedor que imita a los demás inputs de texto */}
            <div className="relative flex items-center h-[42px] px-3 rounded bg-gray-700 border border-gray-600 transition-colors hover:border-gray-500">
                
                {/* Fondo de la barra */}
                <div className="absolute left-3 right-3 h-1.5 bg-gray-900 rounded-full shadow-inner overflow-hidden">
                    {/* Tramo Activo de la barra */}
                    <div 
                        className="absolute h-full bg-gradient-to-r from-blue-600 to-blue-400" 
                        style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
                    />
                </div>
                
                {/* Inputs invisibles superpuestos */}
                <input 
                    type="range" min={min} max={max} step={step} value={minVal} 
                    onChange={e => onChange([Math.min(Number(e.target.value), maxVal), maxVal])}
                    className={`absolute left-3 right-3 w-[calc(100%-1.5rem)] pointer-events-none appearance-none bg-transparent custom-range-slider focus:outline-none ${isMinOnTop ? 'z-30' : 'z-20'}`}
                />
                <input 
                    type="range" min={min} max={max} step={step} value={maxVal} 
                    onChange={e => onChange([minVal, Math.max(Number(e.target.value), minVal)])}
                    className={`absolute left-3 right-3 w-[calc(100%-1.5rem)] pointer-events-none appearance-none bg-transparent custom-range-slider focus:outline-none ${isMinOnTop ? 'z-20' : 'z-30'}`}
                />
            </div>
        </div>
    );
};

// Main App component
const App = ({ user }) => {
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

    const updateListInFirestore = async (listType, listName, newList) => {
        if (!user) return;
        const firestoreKey = `${listName}_${listType}`;
        try {
            await guardarPreferencias({ [firestoreKey]: newList });
        } catch (error) {
            console.error(`Error updating ${firestoreKey}:`, error);
            showMessage("No se ha podido guardar el cambio. Revisa la conexión.");
        }
    };

    const updateStreamingPrefsInFirestore = async (newSelected, newFilterState) => {
        if (!user) return;
        try {
            await guardarPreferencias({ selected_providers: newSelected, filter_by_streaming: newFilterState });
        } catch (error) { console.error("Error updating streaming prefs:", error); }
    };

    const toggleList = (id, listName) => {
        const currentTypeLists = userLists[searchType];
        const currentList = currentTypeLists[listName];
        const newList = currentList.includes(id) ? currentList.filter(itemId => itemId !== id) : [...currentList, id];
        setUserLists(prev => ({ ...prev, [searchType]: { ...prev[searchType], [listName]: newList } }));
        updateListInFirestore(searchType, listName, newList);
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
                await guardarPreferencias({ watchedSeasons_tv: newWatchedSeasons, watchingSeasons_tv: newWatchingSeasons, watched_tv: newWatchedList });
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
            const batch = itemsMissingRuntime.slice(0, 5);
            const updates = {};

            await Promise.all(batch.map(async (item) => {
                try {
                    const res = await fetch(`https://api.themoviedb.org/3/movie/${item.id}?api_key=${TMDB_API_KEY}&language=es-ES`);
                    if (res.ok) {
                        const data = await res.json();
                        updates[item.id] = data.runtime;
                        if (contentCache.current[`movie_${item.id}`]) contentCache.current[`movie_${item.id}`].runtime = data.runtime;
                    } else updates[item.id] = null; // sin duración en TMDB: no volver a pedirla
                } catch (e) { console.error(e); }
            }));

            if (Object.keys(updates).length > 0) {
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
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                const newLists = { ...userLists };
                if (importedData.movie) newLists.movie = importedData.movie;
                if (importedData.tv) newLists.tv = { ...newLists.tv, ...importedData.tv, watchedSeasons: importedData.tv.watchedSeasons || {}, watchingSeasons: importedData.tv.watchingSeasons || {} };
                setUserLists(newLists);
                if (importedData.selectedProviders) setSelectedProviders(importedData.selectedProviders);
                if (typeof importedData.filterByStreaming !== 'undefined') setFilterByStreaming(importedData.filterByStreaming);
                
                ['movie', 'tv'].forEach(type => {
                    ['watched', 'discarded', 'favorites', 'pending'].forEach(list => {
                        updateListInFirestore(type, list, newLists[type][list]);
                    });
                });
                
                if (user) {
                    await guardarPreferencias({ watchedSeasons_tv: newLists.tv.watchedSeasons, watchingSeasons_tv: newLists.tv.watchingSeasons, selected_providers: importedData.selectedProviders || [], filter_by_streaming: importedData.filterByStreaming || false });
                }
                showMessage("Datos restaurados correctamente.");
            } catch (err) { showMessage("Error al leer backup."); }
        };
        reader.readAsText(file);
        event.target.value = ''; 
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
        setViewMode('search');
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
            itemsToDisplay.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            setContent(itemsToDisplay);
        } catch (err) { setError("Error al cargar la lista."); } 
        finally { if (!isBackgroundUpdate) setLoading(false); }
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

            finalFilteredContent.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            const finalResults = finalFilteredContent.slice(0, CONTENT_TO_FETCH_COUNT);
            setContent(finalResults);
            setLastSearchResults(finalResults); 
            lastSearchResultsType.current = searchType;
            addToCache(finalResults);
            if (finalResults.length === 0) showMessage(`No se encontró contenido.`);
        } catch (err) { console.error(err); setError(`Error al cargar resultados.`); } finally { setLoading(false); }
    }, [TMDB_API_KEY, selectedGenre, titleFilter, peopleFilter, yearRange, ratingRange, votesRange, selectedProviders, filterByStreaming, searchType, currentYear]);

    useEffect(() => {
        const currentLists = userLists[searchType];
        if (viewMode === 'search') {
            if (lastSearchResults.length > 0 && lastSearchResultsType.current === searchType) setContent(lastSearchResults);
            else setContent([]);
        } else {
            const targetList = viewMode === 'favorites' ? currentLists.favorites : viewMode === 'pending' ? currentLists.pending : viewMode === 'watched' ? currentLists.watched : currentLists.discarded;
            fetchListItems(targetList, false); 
        }
    }, [viewMode, searchType]); 

    useEffect(() => {
        if (viewMode === 'search') return;
        const currentLists = userLists[searchType];
        const targetList = viewMode === 'favorites' ? currentLists.favorites : viewMode === 'pending' ? currentLists.pending : viewMode === 'watched' ? currentLists.watched : currentLists.discarded;
        fetchListItems(targetList, true); 
    }, [userLists]); 

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
        const sorted = [...content].sort((a, b) => {
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
        
        const currentIds = content.map(c => c.id).join(',');
        const newIds = sorted.map(c => c.id).join(',');
        if (currentIds !== newIds) setContent(sorted);
    };

    const handleExploreClick = () => setViewMode('search');
    const handleSearchClick = () => { setViewMode('search'); fetchContent(); };
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
            if (!response.ok) throw new Error(`Error LLM`);
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
        } catch (err) { console.error(err); setErrorLLM("Error al generar respuesta."); } finally { setLlmLoading(false); }
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
                <BarraCuenta user={user} geminiKey={geminiKey} onGeminiKeyChange={async (key) => {
                    setGeminiKey(key);
                    await guardarPreferencias({ gemini_key: key });
                }} />
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
                        </h2>
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

            <PlatformAnalysisModal 
                isOpen={analysisModal.isOpen}
                onClose={() => setAnalysisModal({ ...analysisModal, isOpen: false })}
                data={analysisModal.data}
                loading={analysisModal.loading}
                searchType={searchType}
                progress={analysisModal.progress}
                total={analysisModal.total}
            />

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