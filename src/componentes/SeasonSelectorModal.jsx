import React, { useState, useEffect } from 'react';

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

export default SeasonSelectorModal;
