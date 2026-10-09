import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Entrada from './Entrada';
import { usuarioActual, alCambiarUsuario } from './datos';
import './index.css';

// Sin cuenta, la pantalla de entrada; con cuenta, la aplicación con las listas de esa persona.
const Raiz = () => {
    const [user, setUser] = useState(undefined);

    useEffect(() => {
        usuarioActual().then(setUser);
        // Solo cambia de usuario de verdad: renovar la sesión no debe volver a cargar la aplicación.
        return alCambiarUsuario(nuevo => setUser(previo => (previo?.id === nuevo?.id ? previo : nuevo)));
    }, []);

    if (user === undefined) return <div className="min-h-screen bg-gray-900" />;
    return user ? <App user={user} /> : <Entrada />;
};

createRoot(document.getElementById('root')).render(<Raiz />);
