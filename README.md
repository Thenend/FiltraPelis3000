# BuscaPelis

Web para buscar películas y series (TMDB), ver sus notas de IMDb, Rotten Tomatoes y Metacritic (OMDb), saber en qué
plataformas están en España y organizarlas en **Favoritas**, **Pendientes**, **Vistas** (en series, por temporadas) y
**Descartadas**. También deja preguntar a la IA (Gemini) sobre lo que aparece en pantalla.

Es la aplicación que estaba en Gemini Canvas, ahora en una web propia: **GitHub Pages** (la página) y **Supabase** (las
cuentas y los datos), gratis los dos. Cada persona entra con su correo y tiene sus propias listas, que se ven igual desde
el ordenador, la tablet o el móvil, y se actualizan solas si cambias algo en otro dispositivo.

## Dirección
<https://thenend.github.io/FiltraPelis3000/>

## Cómo está montada
- **Supabase**: proyecto `buscapelis` (región West EU). La tabla y los permisos están en
  [`supabase/esquema.sql`](supabase/esquema.sql); se puede volver a ejecutar en el **SQL Editor** sin perder nada.
  En **Authentication → URL Configuration**, la **Site URL** y las **Redirect URLs** son la dirección de la web, y en
  **Sign In / Providers → Email**, «Confirm email» está desactivado para entrar al momento al crear la cuenta.
- **GitHub Pages**: en **Settings → Pages → Source**, «GitHub Actions». Cada vez que cambia la rama `main`, la acción
  **Web** (pestaña **Actions**) publica la web en un par de minutos (también a mano: **Actions → Web → Run workflow**).
- La dirección del proyecto de Supabase y su clave publicable están en `src/datos.js`: pueden estar en la página, porque
  sin una cuenta no dan acceso a nada. Si algún día cambian, se pueden poner las variables del repositorio
  `SUPABASE_URL` y `SUPABASE_ANON_KEY` (**Settings → Secrets and variables → Actions → Variables**), que mandan sobre las
  de `src/datos.js`. La clave **service_role** no se usa: no la copies en ningún sitio.

## Primeros pasos
### 1. Crear la cuenta
Abre la web, pulsa **Crear cuenta** y escribe tu correo y una contraseña.

### 2. Traer tus datos de Gemini Canvas
1. En la aplicación de Gemini Canvas, pulsa **💾 Guardar Backup** (abajo del todo): descarga un archivo `.json`.
2. En la web nueva, pulsa **📂 Cargar Backup** y elige ese archivo. Se cargan tus listas, las temporadas vistas de cada
   serie y tus plataformas.

### 3. La IA (opcional)
«Pregunta al IA» usa Gemini. Crea una clave gratis en <https://aistudio.google.com/apikey> y pégala en la web en
**🔑 Clave de IA** (arriba a la derecha). Se guarda solo en tu cuenta.

## Desarrollo
```
npm install
npm run dev      # modo de prueba: los datos se guardan solo en el navegador
npm run build
```
- `src/App.jsx`: la aplicación (la misma de Gemini Canvas, guardando en Supabase en vez de Firestore).
- `src/datos.js`: cuentas y guardado (Supabase, o el navegador en modo de prueba).
- `src/Entrada.jsx`, `src/BarraCuenta.jsx`: entrar, crear cuenta, contraseña, clave de IA y salir.
- `supabase/esquema.sql`: la tabla `preferencias` y sus permisos.
