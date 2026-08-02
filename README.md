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

## Calidad

```bash
npm run check   # type-check (svelte-check)
npm run lint    # prettier + eslint
npm run test    # vitest (frontend)

cd src-tauri && cargo test   # tests de la capa SQLite
```

## Estructura

```
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
