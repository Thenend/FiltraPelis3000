import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En GitHub Pages la web vive en https://<usuario>.github.io/<repositorio>/: la acción «Web» pasa BASE=/<repositorio>/.
export default defineConfig({
    plugins: [react()],
    base: process.env.BASE || '/',
});
