# Roadmaps

Planificador de roadmaps tipo Gantt, como **aplicación de escritorio** (Tauri +
Svelte + TypeScript) con persistencia local en **SQLite**. Offline-first, sin
servidor ni cuentas.

Evolución de la miniaplicación original de un solo HTML (`roadmap_tool_6_6_2.html`)
a una app modular y mantenible. Ver el diseño y las specs en
`openspec/changes/desktop-foundation/`.

## Stack

- **Frontend:** Svelte 5 + Vite + TypeScript
- **Escritorio:** Tauri 2 (core Rust)
- **Persistencia:** SQLite (rusqlite) con esquema versionado y migraciones
- **Fechas:** ISO absolutas (`YYYY-MM-DD`); la ventana temporal es configurable por roadmap

## Requisitos

- Node.js 20+ y npm
- Rust (stable) — `https://rustup.rs`
- macOS con Xcode Command Line Tools (`xcode-select --install`)

## Desarrollo

```bash
npm install

# Web (persistencia en localStorage, para iterar rápido en el navegador)
npm run dev            # http://localhost:1420

# Escritorio (persistencia en SQLite, ventana nativa)
npm run tauri dev
```

## Build

```bash
# Frontend
npm run build

# App de escritorio (binario / .app en src-tauri/target/release/)
npm run tauri build
```

## Distribución web (GitHub Pages)

La app de escritorio no está firmada ni notarizada por Apple, así que en otro Mac
macOS la bloquea por cuarentena. La vía de distribución soportada es la **web app**,
que no necesita firma ni instalación:

**https://jmsoleto.github.io/roadmaps/**

Cada push a `main` la despliega vía `.github/workflows/pages.yml`. Para activarlo una
sola vez: _Settings → Pages → Source: **GitHub Actions**_.

Es una PWA: desde el navegador se puede instalar como ventana propia (Chrome/Edge:
icono de instalar en la barra de direcciones; Safari: _Archivo → Añadir al Dock_) y
funciona sin conexión gracias al service worker.

```bash
npm run build:pages     # build con base /roadmaps/
npm run preview:pages   # servir ese build en http://localhost:4173/roadmaps/
```

El service worker solo se genera en el build web; el build de Tauri lo omite
(se detecta con `TAURI_ENV_PLATFORM`, que Tauri exporta a `beforeBuildCommand`).

### Diferencias respecto a la app de escritorio

|                      | Escritorio (Tauri)               | Web / PWA                    |
| -------------------- | -------------------------------- | ---------------------------- |
| Persistencia         | SQLite en el directorio de datos | `localStorage` del navegador |
| Alcance de los datos | Compartidos por toda la app      | Por navegador y por perfil   |
| Distribución         | Requiere firma/notarización      | Una URL                      |

En web los datos viven en el `localStorage` de ese navegador: no se sincronizan entre
máquinas y se pierden si se borran los datos del sitio. Para mover un roadmap entre
navegadores o hacer copia de seguridad, usa **exportar** / **importar** JSON.

## Calidad

```bash
npm run check   # type-check (svelte-check)
npm run lint    # prettier + eslint
npm run test    # vitest (frontend)

cd src-tauri && cargo test   # tests de la capa SQLite
```

## Estructura

```
.github/workflows/       Despliegue de la web app a GitHub Pages
public/                  Iconos y assets estáticos de la PWA
src/                     Frontend Svelte
  lib/model/             Modelo de datos, derivaciones y restricciones (deps)
  lib/time/              Conversión día↔fecha, segmentos (sprints/trimestres/meses)
  lib/store/             Estado reactivo + seam de persistencia (localStorage / Tauri)
  lib/io/                Import/export JSON (formato actual y heredado)
  lib/components/        Topbar, Toolbar, Gantt, MetaView, Drawer
src-tauri/               Core Rust: comandos Tauri + SQLite (db.rs)
openspec/                Specs y plan del cambio "desktop-foundation"
```

## Datos y portabilidad

- El estado se guarda automáticamente (autosave con debounce) y se vuelca al cerrar.
- **Exportar**: genera un JSON autocontenido del roadmap activo (con sus responsables).
- **Importar**: acepta el formato actual y el **formato heredado** del HTML original
  (índices de día relativos a `2026-01-01`), que se convierten a fechas absolutas.

En modo escritorio la base de datos vive en el directorio de datos de la app
(`~/Library/Application Support/com.roadmaps.app/roadmaps.db` en macOS).
