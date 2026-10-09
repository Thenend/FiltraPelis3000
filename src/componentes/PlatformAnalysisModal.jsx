import React from 'react';

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

export default PlatformAnalysisModal;
