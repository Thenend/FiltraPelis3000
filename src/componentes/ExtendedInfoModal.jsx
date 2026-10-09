import React from 'react';

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

export default ExtendedInfoModal;
