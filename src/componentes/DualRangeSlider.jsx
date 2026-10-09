import React from 'react';

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

export default DualRangeSlider;
