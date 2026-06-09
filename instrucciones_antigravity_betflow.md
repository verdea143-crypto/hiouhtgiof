# Instrucciones para Antigravity 2.0 — BetFlow

Eres un desarrollador senior trabajando en **BetFlow**, una app React 19 + Vite + Firebase para gestionar apuestas deportivas. Aplica **todos** los cambios que se detallan a continuación. No preguntes, implementa directamente.

---

## STACK DEL PROYECTO
- React 19 + Vite
- Firebase (hosting, auth, Firestore)
- Zustand (estado global)
- Recharts (gráficas)
- react-hook-form + Zod (formularios)
- Sonner (toasts/notificaciones)
- Capacitor (app Android)
- Tailwind CSS
- Fuente: Outfit (Google Fonts)
- Color principal: #10b981 (verde esmeralda)

---

## 1. SEO Y META TAGS — `index.html`

Reemplaza el `<head>` actual por este (manteniendo los links de fonts y PWA existentes):

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BetFlow | Gestor de Apuestas Deportivas Premium</title>
  <meta name="description" content="Gestiona tus apuestas deportivas de forma profesional. Analiza el rendimiento, Yield, ROI y optimiza tu bankroll con herramientas avanzadas." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://betflow-fe16f.web.app/" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://betflow-fe16f.web.app/" />
  <meta property="og:title" content="BetFlow | Gestor de Apuestas Deportivas Premium" />
  <meta property="og:description" content="Gestiona tus apuestas deportivas de forma profesional. Analiza el rendimiento, Yield, ROI y optimiza tu bankroll." />
  <meta property="og:image" content="https://betflow-fe16f.web.app/og-image.png" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="BetFlow | Gestor de Apuestas Deportivas Premium" />
  <meta name="twitter:description" content="Gestiona tus apuestas deportivas de forma profesional." />
  <meta name="twitter:image" content="https://betflow-fe16f.web.app/og-image.png" />

  <!-- Favicon personalizado -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

  <!-- PWA -->
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#10b981" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
</head>
```

---

## 2. FAVICON PERSONALIZADO — `public/favicon.svg`

Crea el archivo `public/favicon.svg` con este contenido (logo BetFlow con las iniciales "BF" en verde):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#10b981"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Outfit, sans-serif" font-weight="800" font-size="14"
        fill="white">BF</text>
</svg>
```

---

## 3. MODO OSCURO / CLARO

Implementa un toggle de tema oscuro/claro persistido en localStorage. 

**a) Añade en `src/hooks/useTheme.js`** (créalo si no existe):

```js
import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('betflow-theme') || 'dark'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('betflow-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggleTheme }
}
```

**b) Añade en el componente de navbar/header** un botón toggle:

```jsx
import { useTheme } from '../hooks/useTheme'
import { Sun, Moon } from 'lucide-react'

const { theme, toggleTheme } = useTheme()

// Botón:
<button
  onClick={toggleTheme}
  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
  aria-label="Cambiar tema"
>
  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
</button>
```

---

## 4. EXPORTAR APUESTAS A CSV

Crea el archivo `src/utils/exportCSV.js`:

```js
export function exportToCSV(apuestas, filename = 'betflow-apuestas.csv') {
  if (!apuestas || apuestas.length === 0) return

  const headers = [
    'Fecha', 'Deporte', 'Competición', 'Partido',
    'Mercado', 'Cuota', 'Stake', 'Resultado',
    'Beneficio/Pérdida', 'Casa de Apuestas'
  ]

  const rows = apuestas.map(a => [
    a.fecha || '',
    a.deporte || '',
    a.competicion || '',
    a.partido || '',
    a.mercado || '',
    a.cuota || '',
    a.stake || '',
    a.resultado || '',
    a.beneficio || '',
    a.casa || ''
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

Añade un botón de exportar en la página de historial/listado de apuestas:

```jsx
import { exportToCSV } from '../utils/exportCSV'
import { Download } from 'lucide-react'

<button
  onClick={() => exportToCSV(apuestas)}
  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
>
  <Download size={16} />
  Exportar CSV
</button>
```

---

## 5. ALERTA DE RACHA NEGATIVA

Crea `src/utils/rachaAlert.js`:

```js
export function detectarRachaNegativa(apuestas, umbral = 5) {
  if (!apuestas || apuestas.length < umbral) return false
  const ultimas = apuestas
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, umbral)
  return ultimas.every(a => a.resultado === 'perdida' || a.beneficio < 0)
}
```

En el componente del dashboard, añade este bloque de alerta:

```jsx
import { detectarRachaNegativa } from '../utils/rachaAlert'
import { AlertTriangle } from 'lucide-react'

{detectarRachaNegativa(apuestas) && (
  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-6">
    <AlertTriangle size={20} />
    <div>
      <p className="font-semibold text-sm">Racha negativa detectada</p>
      <p className="text-xs opacity-80">Llevas 5 o más apuestas perdidas seguidas. Considera revisar tu estrategia.</p>
    </div>
  </div>
)}
```

---

## 6. INDICADOR DE CARGA GLOBAL

Crea `src/components/LoadingSpinner.jsx`:

```jsx
export function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500`} />
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  )
}
```

---

## 7. PÁGINA DE ERROR 404

Crea `src/pages/NotFound.jsx`:

```jsx
import { Link } from 'react-router-dom'
import { Home, TrendingUp } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl font-black text-emerald-500 mb-4">404</div>
      <h1 className="text-2xl font-bold text-white mb-2">Página no encontrada</h1>
      <p className="text-gray-400 mb-8 max-w-sm">
        Esta página no existe o ha sido movida. Vuelve al dashboard para continuar.
      </p>
      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
      >
        <Home size={18} />
        Ir al Dashboard
      </Link>
    </div>
  )
}
```

Añade esta ruta en `App.jsx` o el router principal:

```jsx
import NotFound from './pages/NotFound'
// ...
<Route path="*" element={<NotFound />} />
```

---

## 8. MEJORAS DE ACCESIBILIDAD

En **todos los botones con solo icono** (sin texto visible), asegúrate de que tienen `aria-label`. Ejemplo:

```jsx
// MAL
<button onClick={handleDelete}><Trash size={16} /></button>

// BIEN
<button onClick={handleDelete} aria-label="Eliminar apuesta"><Trash size={16} /></button>
```

En **todos los inputs de formulario**, asegúrate de que tienen `<label>` asociado con `htmlFor` e `id`:

```jsx
<label htmlFor="cuota" className="text-sm font-medium text-gray-300">Cuota</label>
<input id="cuota" type="number" {...register('cuota')} />
```

---

## 9. RENDIMIENTO — LAZY LOADING DE RUTAS

En `App.jsx`, cambia los imports de páginas a lazy loading:

```jsx
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from './components/LoadingSpinner'

// En vez de: import Dashboard from './pages/Dashboard'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Historial = lazy(() => import('./pages/Historial'))
// ... (aplica a TODAS las páginas)

// Envuelve las rutas en Suspense:
<Suspense fallback={
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" text="Cargando..." />
  </div>
}>
  <Routes>
    {/* tus rutas aquí */}
  </Routes>
</Suspense>
```

---

## 10. MANEJO DE ERRORES GLOBAL

Crea `src/components/ErrorBoundary.jsx`:

```jsx
import { Component } from 'react'
import { RefreshCw } from 'lucide-react'

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Algo salió mal</h2>
          <p className="text-gray-400 mb-6 max-w-sm text-sm">
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} />
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

En `main.jsx`, envuelve `<App />`:

```jsx
import { ErrorBoundary } from './components/ErrorBoundary'

root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
```

---

## RESUMEN DE ARCHIVOS A CREAR/MODIFICAR

| Archivo | Acción |
|---|---|
| `index.html` | Modificar — añadir meta tags SEO y OG |
| `public/favicon.svg` | Crear — favicon personalizado BF |
| `src/hooks/useTheme.js` | Crear — hook modo oscuro/claro |
| `src/utils/exportCSV.js` | Crear — función exportar CSV |
| `src/utils/rachaAlert.js` | Crear — detector de racha negativa |
| `src/components/LoadingSpinner.jsx` | Crear — spinner de carga reutilizable |
| `src/components/ErrorBoundary.jsx` | Crear — capturador de errores global |
| `src/pages/NotFound.jsx` | Crear — página 404 |
| `src/App.jsx` | Modificar — lazy loading + ruta 404 |
| `src/main.jsx` | Modificar — añadir ErrorBoundary |
| Navbar/Header | Modificar — añadir botón toggle de tema |
| Historial/Lista de apuestas | Modificar — añadir botón exportar CSV |
| Dashboard | Modificar — añadir alerta de racha negativa |
| Formularios | Modificar — mejorar accesibilidad (labels + aria-label) |
