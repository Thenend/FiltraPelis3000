import React, { useState } from 'react';
import { modoPrueba, salir, cambiarContrasena } from './datos';

// Barra de arriba: con qué cuenta se ha entrado, la clave de Gemini para «Pregunta al IA» y salir.
const BarraCuenta = ({ user, geminiKey, onGeminiKeyChange }) => {
    const [panel, setPanel] = useState(null); // null | 'clave' | 'contrasena'
    const [valor, setValor] = useState('');
    const [aviso, setAviso] = useState('');

    const abrir = (cual) => { setPanel(panel === cual ? null : cual); setValor(cual === 'clave' ? geminiKey : ''); setAviso(''); };

    const guardar = async (e) => {
        e.preventDefault();
        try {
            if (panel === 'clave') {
                await onGeminiKeyChange(valor.trim());
                setAviso(valor.trim() ? 'Clave guardada en tu cuenta.' : 'Clave borrada.');
            } else {
                if (valor.length < 6) { setAviso('La contraseña debe tener al menos 6 caracteres.'); return; }
                await cambiarContrasena(valor);
                setValor('');
                setAviso('Contraseña cambiada.');
            }
        } catch (err) {
            setAviso('No se ha podido guardar: ' + (err.message || err));
        }
    };

    const boton = 'px-3 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors';

    return (
        <div className="mb-2">
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-gray-400">
                <span className="truncate">{modoPrueba ? '🧪 Modo de prueba (los datos se guardan solo en este navegador)' : user.email}</span>
                <button onClick={() => abrir('clave')} className={boton}>🔑 Clave de IA</button>
                {!modoPrueba && <button onClick={() => abrir('contrasena')} className={boton}>Contraseña</button>}
                {!modoPrueba && <button onClick={salir} className={boton}>Salir</button>}
            </div>
            {panel && (
                <form onSubmit={guardar} className="mt-3 ml-auto max-w-md bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3 text-sm">
                    {panel === 'clave' ? (
                        <p className="text-gray-300">
                            «Pregunta al IA» usa Gemini de Google. Crea una clave gratis en{' '}
                            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-blue-400 underline">Google AI Studio</a>{' '}
                            y pégala aquí. Se guarda solo en tu cuenta: nadie más la ve.
                        </p>
                    ) : (
                        <p className="text-gray-300">Escribe la contraseña nueva.</p>
                    )}
                    <input
                        type={panel === 'clave' ? 'text' : 'password'}
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        autoComplete={panel === 'clave' ? 'off' : 'new-password'}
                        placeholder={panel === 'clave' ? 'AIza…' : 'Contraseña nueva'}
                        className="p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                        <button type="submit" className="px-4 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold">Guardar</button>
                        <button type="button" onClick={() => setPanel(null)} className={boton}>Cerrar</button>
                        {aviso && <span className="text-gray-300">{aviso}</span>}
                    </div>
                </form>
            )}
        </div>
    );
};

export default BarraCuenta;
