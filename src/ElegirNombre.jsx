import React, { useState } from 'react';
import { ponerNombre, salir, NOMBRE_VALIDO, AVISO_NOMBRE } from './datos';

// Pantalla para elegir el nombre de usuario, para las cuentas que aún no tienen uno.
const ElegirNombre = ({ user, onElegido }) => {
    const [nombre, setNombre] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [aviso, setAviso] = useState('');

    const enviar = async (e) => {
        e.preventDefault();
        const limpio = nombre.trim();
        if (!NOMBRE_VALIDO.test(limpio)) { setAviso(AVISO_NOMBRE); return; }
        setOcupado(true); setAviso('');
        try {
            await ponerNombre(limpio);
            onElegido(limpio);
        } catch (err) {
            setAviso(err.message || 'Algo ha fallado. Inténtalo de nuevo.');
            setOcupado(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <h1 className="text-4xl font-extrabold text-center mb-2">🎬 BuscaPelis 3000</h1>
                <form onSubmit={enviar} className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col gap-4 shadow-2xl">
                    <p className="text-gray-300">
                        Elige tu nombre de usuario. Es lo que verán tus amigos en vez de tu correo, y con él te pueden
                        compartir su biblioteca. Podrás cambiarlo cuando quieras.
                    </p>
                    <input type="text" required autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de usuario"
                        autoComplete="username" maxLength={20}
                        className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" disabled={ocupado} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-full shadow-lg">
                        {ocupado ? 'Un momento…' : 'Guardar'}
                    </button>
                    {aviso && <p className="text-sm text-yellow-300 text-center">{aviso}</p>}
                    <p className="text-sm text-gray-500 text-center">
                        {user.email} ·{' '}
                        <button type="button" onClick={salir} className="text-gray-400 hover:text-gray-200 underline">Salir</button>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ElegirNombre;
