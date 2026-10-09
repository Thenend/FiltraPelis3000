import React from 'react';
import { PESTANAS_COMPARTIBLES } from './CompartirModal';

const ContentCard = ({ 
    item, onContentClick, searchType, isRandomlyChosen, 
    isWatched, isDiscarded, isFavorite, isPending,
    watchedSeasonsCount, watchingSeasonsCount, totalSeasonsKnown,
    onToggleWatched, onToggleDiscarded, onToggleFavorite, onTogglePending,
    isAvailableOnPlatform, 
    onInfoClick,
    externalRating,
    sortBy,
    viewMode,
    amigos // [{ usuario, nombre, pestanas }]: amigos que la tienen en alguna pestaña que te comparten
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
                {amigos?.length > 0 && (
                    <div
                        className="flex flex-wrap justify-center gap-1 mb-2 text-[10px]"
                        title={amigos.map(a => `${a.nombre}: ${PESTANAS_COMPARTIBLES.filter(p => a.pestanas.includes(p.clave)).map(p => p.nombre).join(', ')}`).join('\n')}
                    >
                        {amigos.map(a => (
                            <span key={a.usuario} className="bg-indigo-900/60 text-indigo-200 border border-indigo-700/60 px-1.5 py-0.5 rounded-full max-w-full truncate">
                                👥 {a.nombre} {PESTANAS_COMPARTIBLES.filter(p => a.pestanas.includes(p.clave)).map(p => p.icono).join('')}
                            </span>
                        ))}
                    </div>
                )}
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

export default ContentCard;
