import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Entrada from './Entrada';
import ElegirNombre from './ElegirNombre';
import { usuarioActual, alCambiarUsuario, miNombre } from './datos';
import './index.css';

// Sin cuenta, la pantalla de entrada; con cuenta sin nombre de usuario, la de elegirlo; si no, la aplicación con las
// listas de esa persona.
const Raiz = () => {
    const [user, setUser] = useState(undefined);
    // El nombre de usuario de esa cuenta. undefined: cargando; null: aún no tiene; '' si no se ha podido saber (se entra igual).
    const [perfil, setPerfil] = useState({ id: null, nombre: undefined });
    const nombre = user && perfil.id === user.id ? perfil.nombre : undefined;
    const setNombre = (n) => setPerfil({ id: user.id, nombre: n });

    useEffect(() => {
        usuarioActual().then(setUser);
        // Solo cambia de usuario de verdad: renovar la sesión no debe volver a cargar la aplicación.
        return alCambiarUsuario(nuevo => setUser(previo => (previo?.id === nuevo?.id ? previo : nuevo)));
    }, []);

    useEffect(() => {
        if (!user) return;
        let activo = true;
        const id = user.id;
        miNombre()
            .then(n => { if (activo) setPerfil({ id, nombre: n }); })
            .catch(error => { console.error("Error loading username:", error); if (activo) setPerfil({ id, nombre: '' }); });
        return () => { activo = false; };
    }, [user?.id]);

    if (user === undefined || (user && nombre === undefined)) return <div className="min-h-screen bg-gray-900" />;
    if (!user) return <Entrada />;
    if (nombre === null) return <ElegirNombre user={user} onElegido={setNombre} />;
    return <App user={user} nombre={nombre} onNombreCambiado={setNombre} />;
};

createRoot(document.getElementById('root')).render(<Raiz />);
