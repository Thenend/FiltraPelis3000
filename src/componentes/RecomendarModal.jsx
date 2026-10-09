import React, { useState, useEffect } from 'react';
import { recomendar } from '../datos';

// Ventana para recomendar una película o serie: se marcan amigos (gente con la que compartes o que comparte contigo, o
// con quien os habéis recomendado algo), se pueden escribir otros nombres de usuario y se añade una nota si se quiere.
const RecomendarModal = ({ obra, onClose, amigos, onRecomendada }) => {
    const [marcados, setMarcados] = useState([]);
    const [otros, setOtros] = useState('');
    const [nota, setNota] = useState('');
    const [aviso, setAviso] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [hecho, setHecho] = useState(false);

    useEffect(() => { setMarcados([]); setOtros(''); setNota(''); setAviso(''); setHecho(false); }, [obra]);

    if (!obra) return null;

    const enviar = async (e) => {
        e.preventDefault();
        const nombres = otros.split(',').map(n => n.trim()).filter(Boolean);
        if (marcados.length === 0 && nombres.length === 0) { setAviso('Marca a algún amigo o escribe su nombre de usuario.'); return; }
        setOcupado(true);
        setAviso('');
        try {
            const n = await recomendar(marcados, nombres, obra.tipo, obra.id, nota.trim());
            setAviso(n === 1 ? 'Recomendada. La verá en su apartado «Recomendadas».' : `Recomendada a ${n} personas. La verán en su apartado «Recomendadas».`);
            setHecho(true);
            onRecomendada?.();
        } catch (err) {
            setAviso('No se ha podido recomendar: ' + (err.message || err));
        } finally { setOcupado(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto text-sm" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start gap-2 mb-4">
                    <h2 className="text-xl font-bold text-blue-300">💌 Recomendar «{obra.titulo}»</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none" title="Cerrar">×</button>
                </div>

                {hecho ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <p className="text-gray-200">{aviso}</p>
                        <button onClick={onClose} className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold">Entendido</button>
                    </div>
                ) : (
                    <form onSubmit={enviar} className="flex flex-col gap-3">
                        {amigos.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-gray-300">¿A quién?</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {amigos.map(a => (
                                        <label key={a.usuario} className="flex items-center gap-1.5 cursor-pointer select-none text-gray-200">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4"
                                                disabled={ocupado}
                                                checked={marcados.includes(a.usuario)}
                                                onChange={(e) => setMarcados(e.target.checked ? [...marcados, a.usuario] : marcados.filter(x => x !== a.usuario))}
                                            />
                                            {a.nombre}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        <label className="flex flex-col gap-1 text-gray-300">
                            {amigos.length > 0 ? 'Otras personas (nombres de usuario separados por comas):' : 'Nombre de usuario de la otra persona (o varios separados por comas):'}
                            <input
                                type="text"
                                value={otros}
                                onChange={(e) => setOtros(e.target.value)}
                                placeholder="Nombre de usuario"
                                autoComplete="off"
                                disabled={ocupado}
                                className="p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-gray-300">
                            Nota (si quieres):
                            <textarea
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                maxLength={300}
                                rows={3}
                                placeholder="Ej: Es de las que te gustan, no te la pierdas"
                                disabled={ocupado}
                                className="p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                            />
                        </label>
                        {aviso && <p className="text-gray-200">{aviso}</p>}
                        <div>
                            <button type="submit" disabled={ocupado} className="px-5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50">
                                {ocupado ? 'Enviando…' : 'Recomendar'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RecomendarModal;
