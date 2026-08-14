# Roadmaps

Planificador de roadmaps tipo Gantt, como **aplicación web** (Svelte + TypeScript)
con persistencia local en el navegador. Offline-first, sin servidor ni cuentas.

**https://jmsoleto.github.io/roadmaps/**

Evolución de la miniaplicación original de un solo HTML (`roadmap_tool_6_6_2.html`)
a una app modular y mantenible. Ver las specs en `openspec/specs/` y el historial
de cambios en `openspec/changes/archive/`.

## Stack

- **Frontend:** Svelte 5 + Vite + TypeScript
- **Persistencia:** `localStorage` del navegador, con export/import JSON como backup
- **Distribución:** PWA en GitHub Pages
- **Fechas:** ISO absolutas (`YYYY-MM-DD`); la ventana temporal es configurable por roadmap

## Requisitos

- Node.js 20+ y npm

## Desarrollo

```bash
npm install
npm run dev            # http://localhost:1420
```

## Build

```bash
npm run build           # build web
npm run build:pages     # build con base /roadmaps/ (el que se publica)
npm run preview:pages   # servir ese build en http://localhost:4173/roadmaps/
```

## Distribución (GitHub Pages)

Cada push a `main` despliega la app vía `.github/workflows/pages.yml`, que solo
publica si la batería de tests pasa. Para activarlo una sola vez:
_Settings → Pages → Source: **GitHub Actions**_.

Es una PWA: desde el navegador se puede instalar como ventana propia (Chrome/Edge:
icono de instalar en la barra de direcciones; Safari: _Archivo → Añadir al Dock_) y
funciona sin conexión gracias al service worker.

## Datos

Los roadmaps viven en el `localStorage` del navegador, así que son **propios de cada
navegador y de cada perfil**: no se sincronizan entre máquinas y se pierden si se
borran los datos del sitio. Para mover un roadmap entre navegadores o hacer copia de
seguridad, usa **exportar** / **importar** JSON.

- El estado se guarda automáticamente (autosave con debounce) y se vuelca al cerrar
  la pestaña.
- **Exportar**: genera un JSON autocontenido del roadmap activo (con sus responsables).
- **Importar**: acepta el formato actual y el **formato heredado** del HTML original
  (índices de día relativos a `2026-01-01`), que se convierten a fechas absolutas.

## Calidad

```bash
npm run check   # type-check (svelte-check)
npm run lint    # prettier + eslint
npm run test    # vitest
```

## Estructura

```
.github/workflows/       Despliegue de la web app a GitHub Pages
public/                  Iconos y assets estáticos de la PWA
src/                     Frontend Svelte
  lib/model/             Modelo de datos, derivaciones, restricciones (deps) y completitud
  lib/time/              Conversión día↔fecha, segmentos (sprints/trimestres/meses)
  lib/store/             Estado reactivo + seam de persistencia (localStorage)
  lib/theme/             Temas: paletas, resolución de tokens, contraste
  lib/io/                Import/export JSON (formato actual y heredado)
  lib/components/        Topbar, Toolbar, Gantt, MetaView, Drawer
openspec/                Specs vigentes y historial de cambios
```
