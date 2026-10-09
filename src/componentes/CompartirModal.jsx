import React, { useState } from 'react';
import { compartirBiblioteca, dejarDeVer } from '../datos';

export const PESTANAS_COMPARTIBLES = [
    { clave: 'favorites', nombre: 'Favoritas', icono: '❤️' },
    { clave: 'pending', nombre: 'Pendientes', icono: '⏳' },
    { clave: 'watched', nombre: 'Vistas', icono: '👁️' },
];

// Nombre corto de una cuenta: lo que va antes de la @ del correo.
export const nombreDe = (email) => (email || '').split('@')[0] || email;

const Casillas = ({ marcadas, onChange, desactivado }) => (
    <div className="flex flex-wrap gap-3">
        {PESTANAS_COMPARTIBLES.map(p => (
            <label key={p.clave} className="flex items-center gap-1.5 cursor-pointer select-none text-gray-200">
                <input
                    type="checkbox"
                    disabled={desactivado}
                    checked={marcadas.includes(p.clave)}
                    onChange={(e) => onChange(e.target.checked ? [...marcadas, p.clave] : marcadas.filter(x => x !== p.clave))}
                    className="w-4 h-4"
                />
                {p.icono} {p.nombre}
            </label>
        ))}
    </div>
);

// Ventana para compartir tu biblioteca: con quién compartes y qué pestañas, y quién comparte contigo.
const CompartirModal = ({ isOpen, onClose, compartidos, onCambio }) => {
    const [email, setEmail] = useState('');
    const [pestanas, setPestanas] = useState(PESTANAS_COMPARTIBLES.map(p => p.clave));
    const [aviso, setAviso] = useState('');
    const [ocupado, setOcupado] = useState(false);

    if (!isOpen) return null;

    const doy = compartidos.filter(c => c.direccion === 'doy');
    const recibo = compartidos.filter(c => c.direccion === 'recibo');

    const hacer = async (accion, mensaje) => {
        setOcupado(true);
        setAviso('');
        try {
            await accion();
            await onCambio();
            if (mensaje) setAviso(mensaje);
            return true;
        } catch (err) {
            setAviso('No se ha podido guardar: ' + (err.message || err));
            return false;
        } finally { setOcupado(false); }
    };

    const compartir = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setAviso('Escribe el correo de la otra persona.'); return; }
        if (pestanas.length === 0) { setAviso('Marca al menos una pestaña.'); return; }
        const ok = await hacer(() => compartirBiblioteca(email.trim(), pestanas), `Compartido con ${email.trim()}.`);
        if (ok) setEmail('');
    };

    const cambiarPestanas = (c, nuevas) => {
        hacer(() => compartirBiblioteca(c.email, nuevas), nuevas.length === 0 ? `Ya no compartes nada con ${c.email}.` : '');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 max-w-lg w-full max-h-[90vh] overflow-y-auto text-sm" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-blue-300">👥 Compartir tu biblioteca</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none" title="Cerrar">×</button>
                </div>

                <form onSubmit={compartir} className="flex flex-col gap-3 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <p className="text-gray-300">
                        Escribe el correo con el que la otra persona entra en BuscaPelis y marca qué pestañas quieres que vea
                        (de películas y de series). Solo podrá mirarlas, no cambiarlas.
                    </p>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        autoComplete="off"
                        className="p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Casillas marcadas={pestanas} onChange={setPestanas} desactivado={ocupado} />
                    <div>
                        <button type="submit" disabled={ocupado} className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50">Compartir</button>
                    </div>
                </form>

                {aviso && <p className="mt-3 text-gray-200">{aviso}</p>}

                <h3 className="mt-6 mb-2 font-bold text-gray-200">Compartes con</h3>
                {doy.length === 0 ? <p className="text-gray-500">Todavía con nadie.</p> : (
                    <ul className="flex flex-col gap-2">
                        {doy.map(c => (
                            <li key={c.usuario} className="bg-gray-700/60 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-center gap-2">
                                    <span className="font-semibold text-white truncate">{c.email}</span>
                                    <button disabled={ocupado} onClick={() => hacer(() => compartirBiblioteca(c.email, []), `Ya no compartes nada con ${c.email}.`)} className="px-3 py-1 rounded-full bg-gray-600 hover:bg-red-700 text-gray-100 text-xs whitespace-nowrap">Dejar de compartir</button>
                                </div>
                                <Casillas marcadas={c.pestanas} onChange={(nuevas) => cambiarPestanas(c, nuevas)} desactivado={ocupado} />
                            </li>
                        ))}
                    </ul>
                )}

                <h3 className="mt-6 mb-2 font-bold text-gray-200">Comparten contigo</h3>
                {recibo.length === 0 ? <p className="text-gray-500">Nadie todavía.</p> : (
                    <ul className="flex flex-col gap-2">
                        {recibo.map(c => (
                            <li key={c.usuario} className="bg-gray-700/60 rounded-lg p-3 flex justify-between items-center gap-2">
                                <div className="min-w-0">
                                    <p className="font-semibold text-white truncate">{c.email}</p>
                                    <p className="text-gray-400">
                                        {PESTANAS_COMPARTIBLES.filter(p => c.pestanas.includes(p.clave)).map(p => `${p.icono} ${p.nombre}`).join('  ·  ')}
                                    </p>
                                </div>
                                <button disabled={ocupado} onClick={() => hacer(() => dejarDeVer(c.usuario), `Ya no verás la biblioteca de ${c.email}.`)} className="px-3 py-1 rounded-full bg-gray-600 hover:bg-red-700 text-gray-100 text-xs whitespace-nowrap">Dejar de verla</button>
                            </li>
                        ))}
                    </ul>
                )}
                {recibo.length > 0 && <p className="mt-2 text-gray-500">Lo que te comparten está en la pestaña «👥 Amigos».</p>}
            </div>
        </div>
    );
};

export default CompartirModal;
